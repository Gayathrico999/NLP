// backend/web/routes/transcripts.ts
import { Router } from 'express';

const transcriptsRouter = Router();

let inMemoryTranscripts: Record<string, unknown> = {};

transcriptsRouter.post("/realtime", async (req, res) => {
    inMemoryTranscripts = req.body as Record<string, unknown>;
    console.log("Settings received and stored:", inMemoryTranscripts);
    res.json({ message: "Transcripts updated" });
})

transcriptsRouter.get("/realtime", (_req, res) => {
  res.json(inMemoryTranscripts);
});

export default transcriptsRouter;
