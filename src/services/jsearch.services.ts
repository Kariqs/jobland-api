import axios from "axios";
import { JSearchJob, FrontendJob } from "../types/job.types";

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const JSEARCH_HOST = "jsearch.p.rapidapi.com";

if (!RAPIDAPI_KEY) {
  throw new Error("RAPIDAPI_KEY is not set in environment variables");
}

export class JSearchService {
  static async searchJobs(
    query: string,
    page: string = "1"
  ): Promise<FrontendJob[]> {
    try {
      const response = await axios.get<{ data: JSearchJob[] }>(
        `https://${JSEARCH_HOST}/search`,
        {
          params: {
            query,
            page,
            num_pages: "1",
            date_posted: "3days",
          },
          headers: {
            "X-RapidAPI-Key": RAPIDAPI_KEY,
            "X-RapidAPI-Host": JSEARCH_HOST,
          },
        }
      );

      const rawJobs = response.data.data || [];
      const transformed = rawJobs.map(JSearchService.transformJob);

      transformed.sort((a, b) => b.postedTimestamp - a.postedTimestamp);

      return transformed;
    } catch (error) {
      console.error("JSearch API error:", error);
      throw new Error("Failed to fetch jobs from JSearch");
    }
  }

  private static transformJob(raw: JSearchJob): FrontendJob {
    let source = "Unknown";
    let bestApplyUrl = raw.job_apply_link || "#";

    if (raw.apply_options?.length) {
      const primary = raw.apply_options[0];
      source = primary.publisher?.trim() || "Unknown";
      bestApplyUrl = primary.apply_link || bestApplyUrl;
    } else if (raw.job_publisher) {
      source = raw.job_publisher;
    }

    source = source
      .replace(/ Jobs$/i, "")
      .replace("Smart Recruiters Jobs", "SmartRecruiters")
      .replace("Jobs by SmartRecruiters", "SmartRecruiters")
      .replace("Talent.com", "Talent")
      .trim();

    const postedDate = new Date(raw.job_posted_at_datetime_utc);
    const hoursAgo = Math.floor((Date.now() - postedDate.getTime()) / 3600000);

    let postedTime = "Just now";
    if (hoursAgo < 1) {
      postedTime = "Just now";
    } else if (hoursAgo < 24) {
      postedTime = `${hoursAgo} hour${hoursAgo === 1 ? "" : "s"} ago`;
    } else {
      postedTime = postedDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    }

    return {
      id: raw.job_id,
      title: raw.job_title?.trim() || "Untitled Position",
      company: raw.employer_name?.trim() || "Unknown Company",
      postedTime,
      postedTimestamp: postedDate.getTime(),
      locationType: JSearchService.determineLocationType(raw),
      visaStatus: JSearchService.guessVisaStatus(raw.job_description || ""),
      source,
      applyUrl: bestApplyUrl,
      applied: false,
    };
  }

  private static determineLocationType(
    job: JSearchJob
  ): FrontendJob["locationType"] {
    if (job.job_is_remote) return "Remote";
    if (job.job_city && job.job_country) return "Onsite";
    return "Hybrid";
  }

  private static guessVisaStatus(description: string): string[] {
    if (!description) return [];

    const text = description.toLowerCase();
    const visas: string[] = [];

    if (/(h1b|h-1b)/i.test(text)) visas.push("H1B");
    if (/green card|gc/i.test(text)) visas.push("GC");
    if (/(usc|us citizen)/i.test(text)) visas.push("USC");
    if (/(opt|stem opt)/i.test(text)) visas.push("OPT");

    return visas;
  }
}
