import { Request, Response } from "express";
import { AuthService } from "../services/auth.services";

export class AuthController {
  static async createAccount(req: Request, res: Response) {
    try {
      const result = await AuthService.createUser(req.body);
      return res.status(201).json({
        success: true,
        ...result,
      });
    } catch (error: any) {
      console.log(error);
      return res.status(400).json({
        success: false,
        message: error.message || "Registration failed",
      });
    }
  }

  static async activateAccount(req: Request, res: Response) {
    try {
      const { email, token } = req.body;

      if (!email || !token) {
        return res.status(400).json({
          success: false,
          message: "Email and token are required",
        });
      }

      await AuthService.activateAccount(email, token);

      return res.status(200).json({
        message: "Account Activated Successfully.",
      });
    } catch (error: any) {
      return res.status(401).json({
        success: false,
        message: error.message || "Activation failed",
      });
    }
  }

  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: "Email and password are required",
        });
      }

      const result = await AuthService.login(email, password);

      return res.status(200).json({
        token: result.token,
        userId: result.userId,
      });
    } catch (error: any) {
      return res.status(401).json({
        success: false,
        message: error.message || "Login failed",
      });
    }
  }
}
