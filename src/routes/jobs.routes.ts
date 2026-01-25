import { Router } from "express";
import { JobsController } from "../controllers/jobs.controller";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();

router.get("/teaser-jobs", JobsController.getTeaserJobs);
router.get("/", authenticate, JobsController.getJobs);
router.post("/save-job", authenticate, JobsController.saveAppliedJob);
router.get("/fetch-jobs", authenticate, JobsController.getUserSavedJobs);

export default router;
