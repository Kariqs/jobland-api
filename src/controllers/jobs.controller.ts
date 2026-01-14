import { Request, Response } from "express";
import { JSearchService } from "../services/jsearch.services";

export class JobsController {
  static async getJobs(req: Request, res: Response) {
    try {
      const query = (req.query.query as string) || "software engineer remote";
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
}
