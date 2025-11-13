import WebSocket, { WebSocketServer } from 'ws';
import dotenv from 'dotenv';
import type {
  ServerToClientMessage,
  TranscriptionResult,
  StartMessage
} from '@poll-automation/types';
import { forwardToLLMBuffer } from '../services/llm-forwarder';

dotenv.config();

const WHISPER_WS_URL = process.env.WHISPER_WS_URL || 'ws://localhost:8000';
console.log('🔗 Backend will connect to Whisper at:', WHISPER_WS_URL);

interface ClientSession {
  frontendSocket: WebSocket;
  whisperSocket: WebSocket;
  guestId: string;
  meetingId: string;
}

interface BufferedSession extends ClientSession {
  pendingAudio: Buffer[];
}

function rawDataToBuffer(data: WebSocket.RawData): Buffer {
  if (Buffer.isBuffer(data)) return data as Buffer;
  if (data instanceof ArrayBuffer) return Buffer.from(new Uint8Array(data));
  if (Array.isArray(data)) return Buffer.concat(data as Buffer[]);
  return Buffer.from(String(data));
}

export const setupWebSocketServer = (server: import('http').Server) => {
  const wss = new WebSocketServer({ server });
  console.log(`Backend WebSocket server attached to HTTP server.`);

  wss.on('connection', (frontendSocket: WebSocket) => {
    let session: BufferedSession | null = null;

    frontendSocket.on('message', async (data: WebSocket.RawData, isBinary: boolean) => {
      try {
        if (!isBinary) {
          const msg: StartMessage = JSON.parse(data.toString());
          console.log('[ws-server-clean] control message from frontend:', msg.type, 'guestId=', msg.guestId);

          if (msg.type === 'start' && msg.guestId && msg.meetingId) {
            if (session && session.whisperSocket) {
              try { session.whisperSocket.close(); } catch (e) { /* ignore */ }
              session = null;
            }

            const whisperSocket = new WebSocket(WHISPER_WS_URL);
            session = { frontendSocket, whisperSocket, guestId: msg.guestId, meetingId: msg.meetingId, pendingAudio: [] };

            whisperSocket.on('open', () => {
              console.log('[ws-server-clean] Whisper socket open — sending start');
              try { whisperSocket.send(JSON.stringify({ type: 'start', guestId: msg.guestId, meetingId: msg.meetingId })); }
              catch (err) { console.error('[ws-server-clean] error sending start to Whisper:', err); }

              if (session && session.pendingAudio.length > 0) {
                console.log(`[ws-server-clean] flushing ${session.pendingAudio.length} buffered chunks to Whisper`);
                for (const chunk of session.pendingAudio) {
                  try { whisperSocket.send(chunk, { binary: true }); }
                  catch (err) { console.error('[ws-server-clean] error sending buffered chunk to Whisper:', err); }
                }
                session.pendingAudio = [];
              }
            });

            whisperSocket.on('message', (whisperData) => {
              try {
                const transcript: TranscriptionResult = JSON.parse(whisperData.toString());
                const forwardMsg: ServerToClientMessage = {
                  type: 'transcription',
                  text: transcript.text,
                  start: transcript.start,
                  end: transcript.end,
                  guestId: transcript.guestId,
                  meetingId: transcript.meetingId
                };

                console.log('[ws-server-clean] received transcription from Whisper:', forwardMsg.text?.slice(0, 120));
                if (frontendSocket.readyState === WebSocket.OPEN) {
                  frontendSocket.send(JSON.stringify(forwardMsg));
                  console.log('[ws-server-clean] forwarded transcription to frontend');
                }

                forwardToLLMBuffer(forwardMsg);
              } catch (err) { console.error('[ws-server-clean] error parsing Whisper message:', err); }
            });

            whisperSocket.on('error', (err) => { console.error('[ws-server-clean] Whisper socket error:', err); });
            whisperSocket.on('close', (code, reason) => { console.log(`[ws-server-clean] Whisper socket closed: code=${code} reason=${String(reason)}`); });
          }
        } else {
          if (!session) { console.warn('[ws-server-clean] binary audio received but no active session — dropping'); return; }
          const whisperOpen = session.whisperSocket && session.whisperSocket.readyState === WebSocket.OPEN;
          if (whisperOpen) {
            try { session.whisperSocket.send(data, { binary: true }); console.log('[ws-server-clean] forwarded audio chunk to Whisper'); }
            catch (err) { console.error('[ws-server-clean] error forwarding audio to Whisper:', err); }
          } else {
            try { const buf = rawDataToBuffer(data); session.pendingAudio.push(buf); console.log('[ws-server-clean] buffered audio chunk; waiting for Whisper to open'); }
            catch (err) { console.error('[ws-server-clean] error buffering audio chunk:', err); }
          }
        }
      } catch (err) {
        console.error('[ws-server-clean] websocket handler error:', err);
      }
    });

    frontendSocket.on('close', () => {
      try { if (session && session.whisperSocket) session.whisperSocket.close(); } catch (e) { /* ignore */ }
      session = null;
      console.log('[ws-server-clean] frontend socket closed; session cleaned up');
    });
  });
};
