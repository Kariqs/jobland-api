import mongoose, { Schema, Document, Model, Types } from "mongoose";
import { Job } from "../types/job.types";

export interface JobDocument extends Omit<Job, "userId">, Document {
  userId?: Types.ObjectId;
}

const jobSchema = new Schema<JobDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
    },

    company: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
    },

    locationType: {
      type: String,
      enum: ["Remote", "Hybrid", "Onsite", "Unknown"],
      required: true,
      default: "Unknown",
    },

    source: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

jobSchema.index({ userId: 1, title: 1, company: 1 });

export const JobModel: Model<JobDocument> =
  mongoose.models.Job || mongoose.model<JobDocument>("Job", jobSchema);
