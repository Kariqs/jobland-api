import { Request, Response } from "express";
import { JSearchService } from "../services/jsearch.services";

export class JobsController {
  static async getJobs(req: Request, res: Response) {
    try {
      const { query = "software engineer", page = "1" } = req.query;

      if (typeof query !== "string") {
        return res
          .status(400)
          .json({ error: "Query parameter must be a string" });
      }

      const jobs = await JSearchService.searchJobs(query, page as string);

      res.json({
        success: true,
        count: jobs.length,
        jobs,
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
