import { Types } from "mongoose";

export interface IPersonalInfo {
  fullName?: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedin?: string | null;
  github?: string | null;
  portfolio?: string | null;
  other?: Record<string, string>;
}

export interface IExperienceEntry {
  position: string;
  company: string;
  location?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  description: string[];
}

export interface IEducationEntry {
  degree: string;
  field?: string | null;
  institution: string;
  location?: string | null;
  startYear?: string | null;
  endYear?: string | null;
  description?: string[] | null;
}

export interface ICertification {
  name: string;
  issuer?: string | null;
  date?: string | null;
  url?: string | null;
}

export interface IProject {
  name: string;
  description: string[];
  technologies?: string[] | null;
  url?: string | null;
}

export interface ILanguage {
  name: string;
  proficiency?: string | null;
}

export interface IResumeContent {
  personalInfo: IPersonalInfo;
  professionalSummary: string | null;
  experience: IExperienceEntry[];
  education: IEducationEntry[];
  skills: string[];
  certifications: ICertification[];
  projects: IProject[];
  languages: ILanguage[];
}

export interface IResume extends Document {
  userId: Types.ObjectId;
  title: string;
  originalFileName: string;
  mimeType: string;
  fileUrl?: string; // future: S3 / Cloudinary
  extractedContent: IResumeContent;
  createdAt: Date;
  updatedAt: Date;
}
