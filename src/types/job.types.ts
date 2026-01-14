export interface FrontendJob {
  id: string;
  title: string;
  company: string;
  postedTime: string;
  postedTimestamp: number;
  locationType: "Remote" | "Hybrid" | "Onsite" | "Unknown";
  visaStatus: string[];
  source: string;
  applyUrl: string;
  applied: boolean;
}

export interface JSearchJob {
  job_id: string;
  employer_name?: string;
  job_title?: string;
  job_description?: string;
  job_city?: string;
  job_country?: string;
  job_is_remote: boolean;
  job_employment_type?: string;
  job_posted_at_datetime_utc: string;
  job_apply_link: string;
  job_publisher?: string;

  apply_options?: Array<{
    publisher: string;
    apply_link: string;
    is_direct: boolean;
  }>;
}
