import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware";
import {
  getResumesByUserId,
  uploadResume,
} from "../controllers/resume.controller";

const router = Router();

router.post("/upload-resume", authenticate, uploadResume);
router.get("/get-resumes", authenticate, getResumesByUserId);

export default router;
