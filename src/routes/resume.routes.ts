import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware";
import {
  deleteResume,
  getResumeByUserAndResumeId,
  getResumesByUserId,
  saveTailoredResume,
  tailorResume,
  updateResumeByUserAndResumeId,
  uploadResume,
} from "../controllers/resume.controller";
import { extractJobFromURL } from "../controllers/extractjob.controller";
import { uploadResumeMiddleware } from "../middlewares/multer.middleware";
import { generateTailoredResume } from "../controllers/generate.controller";

const router = Router();

router.post("/upload-resume", authenticate, uploadResume);
router.get("/get-resumes", authenticate, getResumesByUserId);
router.get("/get-resume/:id", authenticate, getResumeByUserAndResumeId);
router.put("/update-resume/:id", authenticate, updateResumeByUserAndResumeId);
router.post("/tailor-resume", authenticate, tailorResume);
router.post("/save-resume", authenticate, saveTailoredResume);
router.delete("/delete-resume/:id", authenticate, deleteResume);

router.post("/extract", extractJobFromURL);
router.post("/tailor", uploadResumeMiddleware, generateTailoredResume);

export default router;
