import User from "../models/user.model";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { generateToken } from "../utils/jwt";
import { JwtPayload } from "../types/auth.types";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not set in environment variables");
}

export class AuthService {
  static async createUser(
    userData: Partial<User>
  ): Promise<{ userId: string; message: string }> {
    if (!userData.password) {
      throw new Error("Password is required");
    }
    const existingUser = await User.findOne({ email: userData.email });
    if (existingUser) {
      throw new Error("Email already in use");
    }
    const hashedPassword = await bcrypt.hash(userData.password, 12);
    const user = await User.create({
      ...userData,
      password: hashedPassword,
    });
    return {
      userId: user._id.toString(),
      message: "User has been created successfully",
    };
  }

  static async login(
    email: string,
    password: string
  ): Promise<{ token: string; userId: string }> {
    const user = await User.findOne({ email });
    if (!user) {
      throw new Error("Invalid email or password");
    }
    //if (!user.accountActivated) {
    //  throw new Error("Account is not activated");
    //}
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new Error("Invalid email or password");
    }
    const jwtPayload: JwtPayload = {
      _id: user._id.toString(),
      fullname: user.fullName,
      email: user.email,
      profession:
        user.profession === "other" ? user.otherProfession : user.profession,
    };
    const token = generateToken(jwtPayload);
    return {
      token,
      userId: user._id.toString(),
    };
  }
}
