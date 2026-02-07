import { Request, Response } from "express";
import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";

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

function extractJson(raw: string): string {
  const cleaned = raw
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  if (first === -1 || last === -1) throw new Error("No JSON found");
  return cleaned.slice(first, last + 1);
}

async function tailor(resumeText: string, jobText: string) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You are an ATS-grade resume tailoring engine. You must return valid JSON only.",
        },
        {
          role: "user",
          content: `
Tailor this resume to the job description.
Generate a cover letter based on the resume and job description.
Do not invent facts.

Return JSON exactly in this schema:

{
resume:{
  "personalInfo": {
    "fullName": "",
    "email": null,
    "phone": null,
    "location": null,
    "linkedin": null,
    "github": null,
    "portfolio": null,
    "other": {}
  },
  "professionalSummary": "",
  "experience": [],
  "education": [],
  "skills": [],
  "certifications": [],
  "projects": [],
  "languages": []
        },
  
 "coverLetter": {
    "opening": "",
    "body": [
      "",
      ""
    ],
    "closing": ""
  }   }

Resume:
${resumeText}

Job Description:
${jobText}
          `,
        },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error("OpenAI error: " + err);
  }

  const data = await response.json();
  const raw = data.choices[0].message.content;

  return JSON.parse(extractJson(raw));
}

export const generateTailoredResume = async (req: Request, res: Response) => {
  try {
    const file = req.file;
    const { jobDescription } = req.body;

    if (!file)
      return res.status(400).json({ error: "Resume file is required" });
    if (!jobDescription)
      return res.status(400).json({ error: "jobDescription is required" });

    const resumeText = await extractText(file);

    if (resumeText.length < 100)
      throw new Error("Could not extract resume text");

    const tailored = await tailor(resumeText, jobDescription);

    return res.json( tailored );
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({
      error: "Resume tailoring failed",
      message: err.message,
    });
  }
};
