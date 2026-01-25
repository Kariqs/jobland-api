import { Types } from "mongoose";
import { JobDocument, JobModel } from "../models/jobs.model";
import { Job } from "../types/job.types";

export class JobService {
  static async createJob(jobInfo: Job): Promise<JobDocument> {
    try {
      if (jobInfo.userId && !Types.ObjectId.isValid(jobInfo.userId)) {
        throw new Error("Invalid userId");
      }
      const job = new JobModel(jobInfo);
      return await job.save();
    } catch (error: any) {
      throw new Error(`Failed to create job: ${error.message}`);
    }
  }

  static async fetchSavedJobsByUserId(
    userId: Types.ObjectId,
  ): Promise<JobDocument[]> {
    return JobModel.find({ userId: userId }).sort({ createdAt: -1 });
  }
}
