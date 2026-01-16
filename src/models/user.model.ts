import mongoose, { Schema } from "mongoose";
import { User } from "../types/auth.types";

const userSchema = new Schema<User>(
  {
    agreeToTerms: {
      type: Boolean,
      required: true,
    },
    currentLocation: {
      type: String,
      required: true,
    },
    desiredLocations: {
      type: String,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    experienceLevel: {
      type: String,
      required: true,
    },
    fullName: {
      type: String,
      required: true,
    },
    jobType: {
      type: String,
      required: true,
    },
    needsVisaSponsorship: {
      type: Boolean,
      required: true,
    },
    otherProfession: {
      type: String,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    profession: {
      type: String,
    },
    remoteWork: {
      type: String,
      required: true,
    },
    salaryExpectation: {
      type: String,
    },
    skills: {
      type: String,
    },
    activationKey: { type: String },
    accountActivated: {
      type: Boolean,
      default: false,
    },
    passwordResetKey: { type: String },
    passwordResetExpires: { type: Date },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model<User>("User", userSchema);

export default User;
