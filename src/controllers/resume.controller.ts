import axios from "axios";
import { Response } from "express";
import multer, { FileFilterCallback } from "multer";
import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { Resume } from "../models/resume.model";
import { IResumeContent } from "../types/resume.types";

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
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb: FileFilterCallback) => {
    const allowed = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF and DOCX files are allowed"));
    }
  },
});

async function extractText(file: Express.Multer.File): Promise<string> {
  // PDF
  if (file.mimetype === "application/pdf") {
    const parser = new PDFParse({ data: file.buffer });
    const result = await parser.getText();
    await parser.destroy();
    return result.text || "";
  }

  // DOCX
  if (
    file.mimetype ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const result = await mammoth.extractRawText({ buffer: file.buffer });
    return result.value || "";
  }

  throw new Error("Unsupported file type");
}

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
export async function parseResumeWithGPT(
  text: string,
): Promise<IResumeContent> {
  const url = "https://api.openai.com/v1/chat/completions";

  const payload = {
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `Extract this resume:\n\n"""\n${text}\n"""` },
    ],
    temperature: 0.15,
    max_tokens: 4000,
  };

  // Use AbortController for timeout
  const controller = new AbortController();
  const timeoutMs = 120000; // 2 minutes
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenAI API error: ${res.status} ${errText}`);
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;

    if (!content) throw new Error("No content returned from OpenAI");

    return JSON.parse(content) as IResumeContent;
  } catch (err: any) {
    if (err.name === "AbortError") {
      console.error("GPT request timed out");
    } else {
      console.error("GPT parsing failed:", err.message || err);
    }
    throw new Error("AI parsing failed – please try a different resume");
  } finally {
    clearTimeout(timeout);
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
        return res.status(400).json({ error: "Resume file is required" });

      const rawText = (await extractText(req.file)).trim();

      if (rawText.length < 50) {
        return res.status(400).json({
          error: "Could not extract meaningful text from the PDF",
        });
      }

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

      const resumeExists = await Resume.findOne({ title: title });
      if (resumeExists)
        return res.status(400).json({ error: "PDF resume file is required" });

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

const TAILOR_SYSTEM_PROMPT = `
You are an expert professional resume tailor and career coach.

Task: Tailor the given resume to the job description while being 100% truthful to the original content.

Requirements:
- Output ONLY valid JSON. No explanations, no markdown, no extra text.
- Follow the exact schema structure provided (do not add or remove keys).
- Prioritize experiences, projects, and skills that match the job requirements.
- Rephrase bullet points to include keywords and phrases from the job description naturally.
- Reorder bullet points and experience entries so the most relevant content appears first.
- Strengthen the professionalSummary to directly address the target role and key requirements.
- Move less relevant content to the bottom or keep it minimal.
- Do NOT fabricate any new experiences, skills, degrees, or achievements.
- Preserve all original dates exactly as strings.
- Keep descriptions concise, impactful, and achievement-oriented.
- Tailor the experience description to match the job description

Return the full tailored resume using this exact schema:
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

async function tailorResumeWithGPT(
  originalContent: IResumeContent,
  jobDescription: string,
): Promise<IResumeContent> {
  const response = await axios.post<OpenAIChatCompletionResponse>(
    "https://api.openai.com/v1/chat/completions",
    {
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: TAILOR_SYSTEM_PROMPT },
        {
          role: "user",
          content: `Original Resume (JSON):\n${JSON.stringify(originalContent, null, 2)}\n\nJob Description:\n"""\n${jobDescription}\n"""\n\nTailor the resume to this job. Return only the JSON.`,
        },
      ],
      temperature: 0.1,
      max_tokens: 6000,
    },
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      timeout: 45000,
    },
  );

  const content = response.data.choices[0]?.message?.content?.trim();
  if (!content) throw new Error("No content returned from OpenAI");

  // Clean possible markdown/code fences
  const cleaned = content.replace(/```json|```/g, "").trim();
  return JSON.parse(cleaned) as IResumeContent;
}

export const tailorResume = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const userId = req.user?._id;
    const { resumeTitle, jobDescription, targetTitle } = req.body;

    if (!userId)
      return res.status(401).json({ error: "Authentication required" });
    if (!resumeTitle?.trim())
      return res.status(400).json({ error: "resumeTitle is required" });
    if (!jobDescription?.trim() || jobDescription.trim().length < 50) {
      return res.status(400).json({
        error: "A meaningful job description is required (min 50 characters)",
      });
    }

    // Find original resume
    const originalResume = await Resume.findOne({
      userId,
      title: resumeTitle.trim(),
    });
    if (!originalResume) {
      return res.status(404).json({ error: "Original resume not found" });
    }

    // Tailor using AI
    const tailoredContent = await tailorResumeWithGPT(
      originalResume.extractedContent,
      jobDescription.trim(),
    );

    // Determine title for new tailored resume
    let newTitle = targetTitle?.trim() || `Tailored - ${resumeTitle.trim()}`;

    // Prevent duplicate titles
    let suffix = 1;
    let finalTitle = newTitle;
    while (await Resume.findOne({ userId, title: finalTitle })) {
      finalTitle = `${newTitle} (${suffix++})`;
      if (suffix > 10) break; // safety
    }

    // Create new tailored resume document
    const tailoredResume = new Resume({
      userId,
      title: finalTitle,
      originalFileName: `${originalResume.originalFileName} (Tailored)`,
      mimeType: originalResume.mimeType,
      fileUrl: null,
      extractedContent: tailoredContent,
      originalResumeId: originalResume._id, // optional reference
    });

    await tailoredResume.save();

    return res.status(201).json({
      message: "Resume tailored successfully",
      resume: {
        id: tailoredResume._id.toString(),
        title: tailoredResume.title,
        originalFileName: tailoredResume.originalFileName,
        parsedName:
          tailoredResume.extractedContent.personalInfo?.fullName ||
          "Not detected",
        createdAt: tailoredResume.createdAt.toISOString(),
      },
    });
  } catch (err: any) {
    console.error("[tailorResume] Error:", err?.response?.data || err.message);

    if (
      err.message.includes("No content returned") ||
      err.message.includes("JSON")
    ) {
      return res.status(422).json({
        error: "AI failed to generate valid tailored resume. Please try again.",
      });
    }

    return res
      .status(500)
      .json({ error: "Server error while tailoring resume" });
  }
};

export const deleteResume = async (
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
      userId: userId,
    });

    if (!resume) {
      return res.status(404).json({
        error: "Resume not found or you do not have permission to delete it",
      });
    }

    await Resume.deleteOne({ _id: resumeId });

    return res.status(200).json({
      message: "Resume deleted successfully",
      deletedResumeId: resumeId,
    });
  } catch (error: any) {
    console.error("[deleteResume] Error:", error);
    return res.status(500).json({
      error: "Server error while deleting resume",
    });
  }
};
