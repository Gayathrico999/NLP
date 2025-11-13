import { Router } from "express";

const settingsRouter = Router();

let inMemorySettings: Record<string, unknown> = {};

settingsRouter.post("/settings", (req, res) => {
  inMemorySettings = req.body as Record<string, unknown>;
  console.log("Settings received and stored:", inMemorySettings);
  res.json({ message: "Settings updated" });
});

settingsRouter.get("/settings", (_req, res) => {
  res.json(inMemorySettings);
});

export default settingsRouter;
