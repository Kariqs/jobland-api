import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt";
import { JwtPayload } from "../types/auth.types";

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

export const authenticate = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: "Authorization header missing." });
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Token missing." });
  }

  const decoded = verifyToken(token);

  if (!decoded || !("_id" in decoded)) {
    return res.status(401).json({ message: "Invalid or expired token." });
  }

  req.user = {
    _id: decoded._id,
    fullname: decoded.fullname,
    email: decoded.email,
    profession: decoded.profession,
  };

  next();
};
