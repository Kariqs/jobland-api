import "./config/env.config";
import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes";
import jobsRouter from "./routes/jobs.routes";
import resumeRouter from "./routes/resume.routes";
import connectDB from "./config/db.config";

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = [
  "http://localhost:4200",
  "https://joblandsai.vercel.app",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "DELETE", "PUT", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/auth", authRoutes);
app.use("/api/jobs", jobsRouter);
app.use("/api/resumes", resumeRouter);

app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "JSearch Proxy API is running" });
});

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`API running on http://localhost:${PORT}`);
  });
});
