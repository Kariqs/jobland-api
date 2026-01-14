import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import jobsRouter from "./routes/jobs.routes";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use("/api/jobs", jobsRouter);

app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "JSearch Proxy API is running" });
});

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
