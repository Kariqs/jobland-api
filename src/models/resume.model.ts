import { model, Schema } from "mongoose";
import { IResume } from "../types/resume.types";

const resumeSchema = new Schema<IResume>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      unique: true,
      required: true,
      trim: true,
      maxlength: 120,
    },
    originalFileName: { type: String, required: false },
    mimeType: { type: String, required: false },
    fileUrl: { type: String, required: false, sparse: true },
    extractedContent: {
      type: {
        personalInfo: { type: Object, required: true, default: {} },
        professionalSummary: { type: String, default: null },
        experience: { type: [Object], default: [] },
        education: { type: [Object], default: [] },
        skills: { type: [String], default: [] },
        certifications: { type: [Object], default: [] },
        projects: { type: [Object], default: [] },
        languages: { type: [Object], default: [] },
      },
      required: true,
    },
  },
  { timestamps: true },
);

export const Resume = model<IResume>("Resume", resumeSchema);
