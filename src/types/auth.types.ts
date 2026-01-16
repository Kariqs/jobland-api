import { Types } from "mongoose";

export interface User {
  _id: Types.ObjectId;
  agreeToTerms: boolean;
  currentLocation: string;
  desiredLocations?: string;
  email: string;
  experienceLevel: string;
  fullName: string;
  jobType: string;
  needsVisaSponsorship: boolean;
  otherProfession?: string;
  password: string;
  profession?: string;
  remoteWork: string;
  salaryExpectation?: string;
  skills?: string;
  activationKey?: string;
  accountActivated?: boolean;
  passwordResetKey?: string;
  passwordResetExpires?: Date;
}

export interface JwtPayload {
  _id: string;
  fullname: string;
  email: string;
  profession?: string;
}
