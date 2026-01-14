import { Router } from 'express';
import { JobsController } from '../controllers/jobs.controller';

const router = Router();

router.get('/', JobsController.getJobs);

export default router;