import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware";
import {
  getResumeByUserAndResumeId,
  getResumesByUserId,
  updateResumeByUserAndResumeId,
  uploadResume,
} from "../controllers/resume.controller";

const router = Router();

router.post("/upload-resume", authenticate, uploadResume);
router.get("/get-resumes", authenticate, getResumesByUserId);
router.get("/get-resume/:id", authenticate, getResumeByUserAndResumeId);
router.put("/update-resume/:id", authenticate, updateResumeByUserAndResumeId);

export default router;
