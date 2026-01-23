import { Router } from "express";
import { JobsController } from "../controllers/jobs.controller";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();

router.get("/teaser-jobs", JobsController.getTeaserJobs);
router.get("/", authenticate, JobsController.getJobs);

export default router;
