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
  // WebSocket.RawData can be Buffer | ArrayBuffer | Buffer[]
  if (Buffer.isBuffer(data)) return data as Buffer;
  if (data instanceof ArrayBuffer) return Buffer.from(new Uint8Array(data));
  if (Array.isArray(data)) return Buffer.concat(data as Buffer[]);
  // fallback (string)
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
          // control messages (start/stop/ack)
          const msg: StartMessage = JSON.parse(data.toString());
          console.log('[ws-server] control message from frontend:', msg.type, 'guestId=', msg.guestId);

          if (msg.type === 'start' && msg.guestId && msg.meetingId) {
            // close any existing session
            if (session && session.whisperSocket) {
              try { session.whisperSocket.close(); } catch (e) { /* ignore */ }
              session = null;
            }

            const whisperSocket = new WebSocket(WHISPER_WS_URL);
            session = { frontendSocket, whisperSocket, guestId: msg.guestId, meetingId: msg.meetingId, pendingAudio: [] };

            whisperSocket.on('open', () => {
              console.log('[ws-server] Whisper socket open — sending start');
              try {
                whisperSocket.send(JSON.stringify({ type: 'start', guestId: msg.guestId, meetingId: msg.meetingId }));
              } catch (err) {
                console.error('[ws-server] error sending start to Whisper:', err);
              }

              // flush buffered audio
              if (session && session.pendingAudio.length > 0) {
                console.log(`[ws-server] flushing ${session.pendingAudio.length} buffered chunks to Whisper`);
                for (const chunk of session.pendingAudio) {
                  try { whisperSocket.send(chunk, { binary: true }); }
                  catch (err) { console.error('[ws-server] error sending buffered chunk to Whisper:', err); }
                }
                session.pendingAudio = [];
              }
            });

            whisperSocket.on('message', (whisperData) => {
              try {
                const rawData = whisperData.toString();
                console.log('[ws-server] raw Whisper data:', rawData);
                
                let transcript: TranscriptionResult;
                try {
                  transcript = JSON.parse(rawData);
                } catch (parseErr) {
                  console.error('[ws-server] Failed to parse Whisper data:', parseErr);
                  console.log('[ws-server] Raw data was:', rawData);
                  return;
                }
                
                // Validate required fields
                if (!transcript || typeof transcript !== 'object') {
                  console.warn('[ws-server] Invalid transcription data - not an object');
                  return;
                }
                
                if (!transcript.text || !transcript.guestId || !transcript.meetingId) {
                  console.warn('[ws-server] Missing required fields in transcription:', {
                    hasText: !!transcript.text,
                    hasGuestId: !!transcript.guestId,
                    hasMeetingId: !!transcript.meetingId
                  });
                  return;
                }
                
                const forwardMsg: ServerToClientMessage = {
                  type: 'transcription',
                  text: transcript.text,
                  start: transcript.start,
                  end: transcript.end,
                  guestId: transcript.guestId,
                  meetingId: transcript.meetingId
                };

                console.log('[ws-server] received transcription from Whisper:', forwardMsg.text?.slice(0, 120));

                if (frontendSocket.readyState === WebSocket.OPEN) {
                  frontendSocket.send(JSON.stringify(forwardMsg));
                  console.log('[ws-server] forwarded transcription to frontend');
                } else {
                  console.warn('[ws-server] frontend socket not open when forwarding transcription');
                }

                forwardToLLMBuffer(forwardMsg);
              } catch (err) {
                console.error('[ws-server] error parsing Whisper message:', err);
              }
            });

            whisperSocket.on('error', (err) => { console.error('[ws-server] Whisper socket error:', err); });
            whisperSocket.on('close', (code, reason) => { console.log(`[ws-server] Whisper socket closed: code=${code} reason=${String(reason)}`); });
          }
        } else {
          // binary audio frames
          if (!session) { console.warn('[ws-server] binary audio received but no active session — dropping'); return; }
          const whisperOpen = session.whisperSocket && session.whisperSocket.readyState === WebSocket.OPEN;
          if (whisperOpen) {
            try { session.whisperSocket.send(data, { binary: true }); console.log('[ws-server] forwarded audio chunk to Whisper'); }
            catch (err) { console.error('[ws-server] error forwarding audio to Whisper:', err); }
          } else {
            try { const buf = rawDataToBuffer(data); session.pendingAudio.push(buf); console.log('[ws-server] buffered audio chunk; waiting for Whisper to open'); }
            catch (err) { console.error('[ws-server] error buffering audio chunk:', err); }
          }
        }
      } catch (err) {
        console.error('[ws-server] websocket handler error:', err);
      }
    });

    frontendSocket.on('close', () => {
      try { if (session && session.whisperSocket) session.whisperSocket.close(); } catch (e) { /* ignore */ }
      session = null;
      console.log('[ws-server] frontend socket closed; session cleaned up');
    });
  });
};
import WebSocket, { WebSocketServer } from 'ws';
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
  pendingAudio: Array<Buffer>;
}

function rawDataToBuffer(data: WebSocket.RawData): Buffer {
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
    // WebSocket.RawData can be Buffer | ArrayBuffer | Buffer[]
    if (Buffer.isBuffer(data)) return data as Buffer;
    if (data instanceof ArrayBuffer) return Buffer.from(new Uint8Array(data));
    if (Array.isArray(data)) return Buffer.concat(data as Buffer[]);
    // fallback (string)
    return Buffer.from(String(data));
  }

  export const setupWebSocketServer = (server: import('http').Server) => {
    const wss = new WebSocketServer({ server });
    console.log(`Backend WebSocket server attached to HTTP server.`);

    wss.on('connection', (frontendSocket: WebSocket) => {
      let session: BufferedSession | null = null;

      frontendSocket.on('message', async (data: WebSocket.RawData, isBinary) => {
        try {
          if (!isBinary) {
            // control messages (start/stop/ack)
            const msg: StartMessage = JSON.parse(data.toString());
            console.log('[ws-server] control message from frontend:', msg.type, 'guestId=', msg.guestId);

            if (msg.type === 'start' && msg.guestId && msg.meetingId) {
              // if there's an existing session, close it first
              if (session && session.whisperSocket) {
                try {
                  session.whisperSocket.close();
                } catch (e) {}
                session = null;
              }

              const whisperSocket = new WebSocket(WHISPER_WS_URL);

              session = {
                frontendSocket,
                whisperSocket,
                guestId: msg.guestId,
                meetingId: msg.meetingId,
                pendingAudio: []
              };

              whisperSocket.on('open', () => {
                console.log('[ws-server] Whisper socket open — sending start');
                try {
                  whisperSocket.send(JSON.stringify({ type: 'start', guestId: msg.guestId, meetingId: msg.meetingId }));
                } catch (err) {
                  console.error('[ws-server] error sending start to Whisper:', err);
                }

                // flush buffered audio
                if (session && session.pendingAudio.length > 0) {
                  console.log(`[ws-server] flushing ${session.pendingAudio.length} buffered chunks to Whisper`);
                  for (const chunk of session.pendingAudio) {
                    try {
                      whisperSocket.send(chunk, { binary: true });
                    } catch (err) {
                      console.error('[ws-server] error sending buffered chunk to Whisper:', err);
                    }
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

                  console.log('[ws-server] received transcription from Whisper:', forwardMsg.text?.slice(0, 120));

                  if (frontendSocket.readyState === WebSocket.OPEN) {
                    frontendSocket.send(JSON.stringify(forwardMsg));
                    console.log('[ws-server] forwarded transcription to frontend');
                  } else {
                    console.warn('[ws-server] frontend socket not open when forwarding transcription');
                  }

                  forwardToLLMBuffer(forwardMsg);
                } catch (err) {
                  console.error('[ws-server] error parsing Whisper message:', err);
                }
              });

              whisperSocket.on('error', (err) => {
                console.error('[ws-server] Whisper socket error:', err);
              });

              whisperSocket.on('close', (code, reason) => {
                console.log(`[ws-server] Whisper socket closed: code=${code} reason=${String(reason)}`);
              });
            }
          } else {
            // binary audio frames
            if (!session) {
              console.warn('[ws-server] binary audio received but no active session — dropping');
              return;
            }

            const whisperOpen = session.whisperSocket && session.whisperSocket.readyState === WebSocket.OPEN;
            if (whisperOpen) {
              try {
                session.whisperSocket.send(data, { binary: true });
                console.log('[ws-server] forwarded audio chunk to Whisper');
              } catch (err) {
                console.error('[ws-server] error forwarding audio to Whisper:', err);
              }
            } else {
              // buffer until whisper opens
              try {
                const buf = rawDataToBuffer(data);
                session.pendingAudio.push(buf);
                console.log('[ws-server] buffered audio chunk; waiting for Whisper to open');
              } catch (err) {
                console.error('[ws-server] error buffering audio chunk:', err);
              }
            }
          }
        } catch (err) {
          console.error('[ws-server] websocket handler error:', err);
        }
      });

      frontendSocket.on('close', () => {
        try {
          if (session && session.whisperSocket) session.whisperSocket.close();
        } catch (e) {}
        session = null;
        console.log('[ws-server] frontend socket closed; session cleaned up');
      });
    });
  };
                    type: 'start',
                    guestId: msg.guestId,
                    meetingId: msg.meetingId
                  });
                  try {
                    whisperSocket.send(startMsg);
                  } catch (err) {
                    console.error('[ws-server] error sending start to whisper:', err);
                  }

                  // flush any buffered audio
                  if (session && session.pendingAudio.length > 0) {
                    console.log(`[ws-server] flushing ${session.pendingAudio.length} buffered audio chunks to Whisper`);
                    for (const chunk of session.pendingAudio) {
                      try {
                        whisperSocket.send(chunk, { binary: true });
                      } catch (err) {
                        console.error('[ws-server] error sending buffered audio to whisper:', err);
                      }
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

                    console.log('[ws-server] received transcription from Whisper:', forwardMsg.text?.slice(0, 100));

                    if (frontendSocket.readyState === WebSocket.OPEN) {
                      frontendSocket.send(JSON.stringify(forwardMsg));
                      console.log('[ws-server] forwarded transcription to frontend');
                    } else {
                      console.warn('[ws-server] frontend socket not open when forwarding transcription');
                    }

                    forwardToLLMBuffer(forwardMsg);
                  } catch (err) {
                    console.error('[ws-server] error parsing/forwarding whisper message:', err);
                  }
                });

                whisperSocket.on('error', (err) => {
                  console.error('Whisper socket error:', err);
                });

                whisperSocket.on('close', (code, reason) => {
                  console.log(`[ws-server] whisper socket closed: code=${code} reason=${reason}`);
                });
              }
            } else {
              // binary audio from frontend
              if (!session) {
                console.warn('[ws-server] received binary audio but no session exists yet; dropping chunk');
                return;
              }

              const wsReady = session.whisperSocket && session.whisperSocket.readyState === WebSocket.OPEN;
              if (wsReady) {
                try {
                  session.whisperSocket.send(data, { binary: true });
                  console.log('[ws-server] forwarded binary audio chunk to Whisper');
                } catch (err) {
                  console.error('[ws-server] error forwarding binary audio to Whisper:', err);
                }
              } else {
                // buffer the audio until whisper connection opens
                try {
                  const buf = Buffer.from(data as WebSocket.RawData);
                  session.pendingAudio.push(buf);
                  console.log('[ws-server] buffered binary audio chunk until Whisper connects');
                } catch (err) {
                  console.error('[ws-server] error buffering audio chunk:', err);
                }
              }
            }
          } catch (err) {
            console.error('WebSocket error:', err);
          }
        });

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
          pendingAudio: Array<Buffer>;
        }

        function rawDataToBuffer(data: WebSocket.RawData): Buffer {
          // WebSocket.RawData can be Buffer | ArrayBuffer | Buffer[]
          if (Buffer.isBuffer(data)) return data as Buffer;
          if (data instanceof ArrayBuffer) return Buffer.from(new Uint8Array(data));
          if (Array.isArray(data)) return Buffer.concat((data as Buffer[]));
          // fallback
          return Buffer.from(String(data));
        }

        export const setupWebSocketServer = (server: import('http').Server) => {
          const wss = new WebSocketServer({ server });
          console.log(`Backend WebSocket server attached to HTTP server.`);

          wss.on('connection', (frontendSocket: WebSocket) => {
            let session: BufferedSession | null = null;

            frontendSocket.on('message', async (data: WebSocket.RawData, isBinary) => {
              try {
                if (!isBinary) {
                  const msg: StartMessage = JSON.parse(data.toString());

                  console.log(`[ws-server] start message from frontend: ${JSON.stringify(msg)}`);

                  if (msg.type === 'start' && msg.guestId && msg.meetingId) {
                    const whisperSocket = new WebSocket(WHISPER_WS_URL);

                    // create session with a small pending buffer until whisper socket is open
                    session = {
                      frontendSocket,
                      whisperSocket,
                      guestId: msg.guestId,
                      meetingId: msg.meetingId,
                      pendingAudio: []
                    };

                    whisperSocket.on('open', () => {
                      console.log('[ws-server] whisper socket opened, sending start to Whisper service');
                      const startMsg = JSON.stringify({
                        type: 'start',
                        guestId: msg.guestId,
                        meetingId: msg.meetingId
                      });
                      try {
                        whisperSocket.send(startMsg);
                      } catch (err) {
                        console.error('[ws-server] error sending start to whisper:', err);
                      }

                      // flush any buffered audio
                      if (session && session.pendingAudio.length > 0) {
                        console.log(`[ws-server] flushing ${session.pendingAudio.length} buffered audio chunks to Whisper`);
                        for (const chunk of session.pendingAudio) {
                          try {
                            whisperSocket.send(chunk, { binary: true });
                          } catch (err) {
                            console.error('[ws-server] error sending buffered audio to whisper:', err);
                          }
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

                        console.log('[ws-server] received transcription from Whisper:', forwardMsg.text?.slice(0, 100));

                        if (frontendSocket.readyState === WebSocket.OPEN) {
                          frontendSocket.send(JSON.stringify(forwardMsg));
                          console.log('[ws-server] forwarded transcription to frontend');
                        } else {
                          console.warn('[ws-server] frontend socket not open when forwarding transcription');
                        }

                        forwardToLLMBuffer(forwardMsg);
                      } catch (err) {
                        console.error('[ws-server] error parsing/forwarding whisper message:', err);
                      }
                    });

                    whisperSocket.on('error', (err) => {
                      console.error('Whisper socket error:', err);
                    });

                    whisperSocket.on('close', (code, reason) => {
                      console.log(`[ws-server] whisper socket closed: code=${code} reason=${reason}`);
                    });
                  }
                } else {
                  // binary audio from frontend
                  if (!session) {
                    console.warn('[ws-server] received binary audio but no session exists yet; dropping chunk');
                    return;
                  }

                  const wsReady = session.whisperSocket && session.whisperSocket.readyState === WebSocket.OPEN;
                  if (wsReady) {
                    try {
                      session.whisperSocket.send(data, { binary: true });
                      console.log('[ws-server] forwarded binary audio chunk to Whisper');
                    } catch (err) {
                      console.error('[ws-server] error forwarding binary audio to Whisper:', err);
                    }
                  } else {
                    // buffer the audio until whisper connection opens
                    try {
                      const buf = rawDataToBuffer(data);
                      session.pendingAudio.push(buf);
                      console.log('[ws-server] buffered binary audio chunk until Whisper connects');
                    } catch (err) {
                      console.error('[ws-server] error buffering audio chunk:', err);
                    }
                  }
                }
              } catch (err) {
                console.error('WebSocket error:', err);
              }
            });

            frontendSocket.on('close', () => {
              try {
                session?.whisperSocket?.close();
              } catch (e) {
                // ignore
              }
            });
          });
        };
