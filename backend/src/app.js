import express from "express";
import { callSolar } from "./services/solar.js";
import { createRecallHandler } from "./routes/recall.js";
import { createJobPostingHandler } from "./routes/job-posting.js";

export function createApp({ solar = callSolar } = {}) {
  const app = express();
  app.use(express.json());
  // CORS — 프론트 origin 허용 (개발 환경)
  const ALLOWED_ORIGINS = [
    ...(process.env.FRONTEND_ORIGIN ? process.env.FRONTEND_ORIGIN.split(",") : []),
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3005",
    "http://127.0.0.1:3005",
  ];

  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && ALLOWED_ORIGINS.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
    }
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
  });


  app.post("/api/recall", createRecallHandler(solar));
  app.post("/api/job-posting", createJobPostingHandler(solar));
  return app;
}

export const app = createApp();
export default app;
