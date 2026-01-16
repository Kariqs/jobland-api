import User from "../models/user.model";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { generateToken } from "../utils/jwt";
import { JwtPayload } from "../types/auth.types";
import { sendEmail } from "../utils/send.email.util";
import crypto from "node:crypto";

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
    const activationToken = crypto.randomUUID();

    const user = await User.create({
      ...userData,
      password: hashedPassword,
      activationKey: activationToken,
    });

    // await sendEmail(
    //   user.email,
    //   user.fullName,
    //   "We're very excited to hev you on board!",
    //   "Welcome to JoblandsAI",
    //   {
    //     instructions:
    //       "To get started, please confirm your email by clicking the link below:",
    //     button: {
    //       text: "Confirm Email",
    //       link: `${process.env.FRONTEND_URL}/activate?email=${user.email}&token=${user.activationKey}`,
    //     },
    //   }
    // );

    return {
      userId: user._id.toString(),
      message: "User has been created successfully. Proceed to login.",
    };
  }

  static async activateAccount(email: string, token: string): Promise<void> {
    const user = await User.findOne({ email });

    if (!user) {
      throw new Error("Invalid activation link");
    }

    if (user.accountActivated) {
      throw new Error("Account is already activated");
    }

    if (!user.activationKey) {
      throw new Error("No activation token found");
    }

    if (user.activationKey !== token) {
      throw new Error("Invalid activation token");
    }
    user.accountActivated = true;
    user.activationKey = undefined;

    await user.save();
  }

  static async login(
    email: string,
    password: string
  ): Promise<{ token: string; userId: string }> {
    const user = await User.findOne({ email });
    if (!user) {
      throw new Error("Invalid email or password");
    }
    // if (!user.accountActivated) {
    //   throw new Error("Account is not activated");
    // }
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
