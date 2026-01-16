import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";

const router = Router();

router.post("/signup", AuthController.createAccount);
router.post("/activate", AuthController.activateAccount);
router.post("/login", AuthController.login);

export default router;
