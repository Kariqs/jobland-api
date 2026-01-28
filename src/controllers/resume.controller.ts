import { Response } from "express";
import multer, { FileFilterCallback } from "multer";
import axios from "axios";
import { PDFParse } from "pdf-parse";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { Resume } from "../models/resume.model";
import { IResume, IResumeContent } from "../types/resume.types";

interface OpenAIChatCompletionResponse {
  id: string;
  object: string;
  choices: Array<{
    message: { role: string; content: string };
    finish_reason: string;
    index: number;
  }>;
  usage?: object;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb: FileFilterCallback) => {
    if (file.originalname.toLowerCase().endsWith(".pdf")) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"));
    }
  },
});

// Replace this with your full JSON schema prompt
const SYSTEM_PROMPT = `
You are an expert resume parser. Extract and organize all relevant information from the resume text into clean, consistent JSON.

Rules:
- Output ONLY valid JSON — nothing else.
- Follow the exact schema structure — do not add/remove top-level keys.
- Missing sections → empty array [] or null / empty object
- Dates: preserve original format as string
- Descriptions/bullet points: array of strings
- Skills: flat array of strings
- Be accurate — do NOT hallucinate or invent data

Required schema:
{
  "personalInfo": {
    "fullName": string,
    "email": string | null,
    "phone": string | null,
    "location": string | null,
    "linkedin": string | null,
    "github": string | null,
    "portfolio": string | null,
    "other": object
  },
  "professionalSummary": string | null,
  "experience": [
    {
      "position": string,
      "company": string,
      "location": string | null,
      "startDate": string | null,
      "endDate": string | null,
      "description": string[]
    }
  ],
  "education": [
    {
      "degree": string,
      "field": string | null,
      "institution": string,
      "location": string | null,
      "startYear": string | null,
      "endYear": string | null,
      "description": string[] | null
    }
  ],
  "skills": string[],
  "certifications": [
    {
      "name": string,
      "issuer": string | null,
      "date": string | null,
      "url": string | null
    }
  ],
  "projects": [
    {
      "name": string,
      "description": string[],
      "technologies": string[] | null,
      "url": string | null
    }
  ],
  "languages": [
    {
      "name": string,
      "proficiency": string | null
    }
  ]
}
`;

// GPT parsing via Axios
async function parseResumeWithGPT(text: string): Promise<IResumeContent> {
  try {
    const response = await axios.post<OpenAIChatCompletionResponse>(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Extract this resume:\n\n"""\n${text}\n"""`,
          },
        ],
        temperature: 0.15,
        max_tokens: 4000,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        timeout: 30000, // 30 seconds timeout
      },
    );

    const content = response.data?.choices?.[0]?.message?.content;
    if (!content) throw new Error("No content returned from OpenAI");

    return JSON.parse(content) as IResumeContent;
  } catch (err: any) {
    console.error("GPT parsing failed:", err?.response?.data || err.message);
    throw new Error("AI parsing failed – please try a different resume");
  }
}

// Express controller
export const uploadResume = [
  upload.single("resume"),

  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?._id;
      const title = req.body.title?.trim();

      if (!userId)
        return res.status(401).json({ error: "Authentication required" });
      if (!title)
        return res.status(400).json({ error: "Resume title is required" });
      if (!req.file)
        return res.status(400).json({ error: "PDF resume file is required" });

      console.log("File size:", req.file.buffer.length);
      console.log("Filename:", req.file.originalname);
      console.log("Mimetype:", req.file.mimetype);

      //PDF parsing
      const parser = new PDFParse({ data: req.file.buffer });
      const result = await parser.getText();
      const rawText = result.text.trim();
      const pages = result.total;

      console.log(
        `pdf-parse v2 extracted ${rawText.length} chars from ${pages} pages`,
      );

      if (rawText.length < 50) {
        return res.status(400).json({
          error: "Could not extract meaningful text from the PDF",
        });
      }

      //GPT parsing
      console.log("Sending text to OpenAI via Axios, length:", rawText.length);
      const structuredContent = await parseResumeWithGPT(rawText);
      console.log("GPT parsing completed");

      const hasUsefulData =
        structuredContent.personalInfo?.fullName ||
        structuredContent.experience?.length > 0 ||
        structuredContent.skills?.length > 0;

      if (!hasUsefulData) {
        return res.status(422).json({
          error: "Could not extract usable resume data.",
        });
      }

      //SAVE
      const resume = new Resume({
        userId,
        title,
        originalFileName: req.file.originalname,
        mimeType: req.file.mimetype,
        fileUrl: null,
        extractedContent: structuredContent,
      });

      await resume.save();

      res.status(201).json({
        message: "Resume uploaded and parsed successfully",
        resume: {
          id: resume._id.toString(),
          title: resume.title,
          originalFileName: resume.originalFileName,
          parsedName:
            resume.extractedContent.personalInfo?.fullName || "Not detected",
          createdAt: resume.createdAt.toISOString(),
        },
      });
    } catch (err: any) {
      console.error("[uploadResume] Error:", err);

      let errorMessage = "Server error during resume processing";

      if (err.message?.includes("AI parsing failed")) {
        errorMessage = err.message;
      }

      res.status(500).json({ error: errorMessage });
    }
  },
];

export const getResumesByUserId = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const resumes = await Resume.find({ userId })
      .sort({ createdAt: -1 })
      .select("_id title originalFileName createdAt ");

    res.status(200).json({
      message: "Resumes fetched successfully.",
      resumes,
    });
  } catch (err) {
    console.error("[getResumesByUserId] Error:", err);
    res.status(500).json({ error: "Server error during fetching resumes" });
  }
};

export const getResumeByUserAndResumeId = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const userId = req.user?._id;
    const resumeId = req.params.id;

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!resumeId) {
      return res.status(400).json({ error: "Resume ID is required" });
    }

    const resume = await Resume.findOne({
      _id: resumeId,
      userId,
    }).select("_id title originalFileName createdAt extractedContent");

    if (!resume) {
      return res.status(404).json({ error: "Resume not found" });
    }

    res.status(200).json({
      message: "Resume fetched successfully.",
      resume,
    });
  } catch (err) {
    console.error("[getResumeByUserAndResumeId] Error:", err);
    res.status(500).json({ error: "Server error during fetching resume" });
  }
};

export const updateResumeByUserAndResumeId = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const userId = req.user?._id;
    const resumeId = req.params.id;

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!resumeId) {
      return res.status(400).json({ error: "Resume ID is required" });
    }

    const { title, extractedContent } = req.body;

    if (!title || !extractedContent) {
      return res.status(400).json({
        error: "Full resume payload (title + extractedContent) is required",
      });
    }

    const updatedResume = await Resume.findOneAndUpdate(
      { _id: resumeId, userId },
      {
        $set: {
          title,
          extractedContent,
        },
      },
      {
        new: true,
        overwrite: false,
        runValidators: true,
      },
    ).select("_id title originalFileName createdAt updatedAt extractedContent");

    if (!updatedResume) {
      return res.status(404).json({ error: "Resume not found" });
    }

    res.status(200).json({
      message: "Resume replaced successfully.",
      resumeId: updatedResume._id,
    });
  } catch (err) {
    console.error("[replaceResumeByUserAndResumeId] Error:", err);
    res.status(500).json({ error: "Server error during replacing resume" });
  }
};
