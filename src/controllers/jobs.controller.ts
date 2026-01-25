import { Request, Response } from "express";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { JSearchService } from "../services/jsearch.services";
import { JobService } from "../services/job.services";
import { Types } from "mongoose";

export class JobsController {
  static async getTeaserJobs(req: Request, res: Response) {
    try {
      const query = "software developer";
      const page = "1";

      const jobs = await JSearchService.searchJobs(query, page);

      res.json({
        success: true,
        count: jobs.length,
        jobs,
        hasMore: jobs.length === 6,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch jobs",
      });
    }
  }

  static async getJobs(req: AuthenticatedRequest, res: Response) {
    try {
      const defaultQuery = `${req.user?.profession}`;
      const query = (req.query.query as string) || defaultQuery;
      const page = (req.query.page as string) || "1";

      const jobs = await JSearchService.searchJobs(query, page);

      res.json({
        success: true,
        count: jobs.length,
        jobs,
        hasMore: jobs.length === 6,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch jobs",
      });
    }
  }

  static async saveAppliedJob(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?._id;

      if (!userId) {
        return res.status(401).json({
          message: "Unable to get user id",
        });
      }

      const jobData = {
        ...req.body,
        userId,
      };

      const job = await JobService.createJob(jobData);

      return res.status(201).json({
        message: "Job saved successfully",
        jobId: job._id,
      });
    } catch (error: any) {
      return res.status(500).json({
        message: "Failed to save job",
        error: error.message,
      });
    }
  }

  static async getUserSavedJobs(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = new Types.ObjectId(req.user!._id);

      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const jobs = await JobService.fetchSavedJobsByUserId(userId);

      return res.status(200).json({
        message: "Jobs fetched successfully",
        jobs: jobs,
      });
    } catch (error: any) {
      return res.status(500).json({
        message: "Failed to fetch jobs",
        error: error.message,
      });
    }
  }
}
