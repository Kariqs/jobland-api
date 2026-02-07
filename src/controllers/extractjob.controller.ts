import * as cheerio from "cheerio";
import { chromium } from "playwright";

function extractJson(raw: string): string {
  let cleaned = raw
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1) {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) return match[0];
    throw new Error("No JSON object found in OpenAI response");
  }
  return cleaned.slice(firstBrace, lastBrace + 1);
}

async function scrapePage(url: string): Promise<string> {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

  const html = await page.content();
  const $ = cheerio.load(html);
  $("script, style, nav, footer, header, iframe, noscript").remove();
  const text = $("body").text().replace(/\s+/g, " ").trim();

  await browser.close();

  if (!text || text.length < 50)
    throw new Error("Job page contains no extractable text");

  return text;
}

const extract = async (url: string) => {
  const text = await scrapePage(url);

  const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      temperature: 0,
      messages: [
        { role: "system", content: "You extract structured job posting data." },
        {
          role: "user",
          content: `
Extract:
- jobTitle
- company
- jobDescription
- requiredSkills (hard skills only)

Return ONLY JSON, no extra text.
Job posting:
${text}
          `,
        },
      ],
    }),
  });

  if (!openaiRes.ok) {
    const err = await openaiRes.text();
    throw new Error("OpenAI API error: " + err);
  }

  const data = await openaiRes.json();
  const raw = data.choices[0].message.content;

  try {
    const json = extractJson(raw);
    return JSON.parse(json);
  } catch (e) {
    throw new Error("Failed to parse JSON from OpenAI:\n" + raw);
  }
};

export const extractJobFromURL = async (req: any, res: any) => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "url is required" });
    }

    const data = await extract(url);
    return res.json(data);
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({
      error: "Job extraction failed",
      message: err.message,
    });
  }
};
