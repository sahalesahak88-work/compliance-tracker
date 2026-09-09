import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getAuthenticatedClinic } from "@/lib/session";

// Uses Gemini's free tier to read an uploaded license/certificate
// (image or PDF) and pull out the fields we need, so the clinic
// doesn't have to type them in by hand.
//
// Requires GEMINI_API_KEY in the environment. Get a free key at
// https://aistudio.google.com/app/apikey

export async function POST(req: NextRequest) {
  const clinic = getAuthenticatedClinic(req);
  if (!clinic) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Document extraction isn't configured yet. Add GEMINI_API_KEY to your environment." },
      { status: 500 }
    );
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
  }

  // Basic size guard — free tier + serverless environments don't
  // want huge uploads
  const MAX_SIZE = 10 * 1024 * 1024; // 10MB
  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "File is too large. Please upload a file under 10MB." },
      { status: 400 }
    );
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json(
      { error: "Unsupported file type. Please upload a JPG, PNG, WEBP, or PDF." },
      { status: 400 }
    );
  }

  try {
    const bytes = await file.arrayBuffer();
    const base64Data = Buffer.from(bytes).toString("base64");

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });

    const prompt = `You are reading a license, certificate, or permit document from a UAE healthcare business.
Extract the following fields and respond with ONLY a JSON object, no other text, no markdown formatting:

{
  "name": "the type/title of the license or certificate (e.g. 'Facility License', 'Radiology Equipment Permit')",
  "number": "the license or certificate number, or null if not found",
  "issuedDate": "the issue date in YYYY-MM-DD format, or null if not found",
  "expiryDate": "the expiry date in YYYY-MM-DD format, or null if not found",
  "authority": "the issuing authority if visible (e.g. DHA, MOH, DOH), or null if not found"
}

If you cannot confidently read a field, use null for it rather than guessing. Respond with ONLY the JSON object.`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Data,
          mimeType: file.type,
        },
      },
    ]);

    const responseText = result.response.text().trim();

    // Strip markdown code fences if Gemini wraps the JSON in them anyway
    const cleaned = responseText.replace(/^```json\s*|^```\s*|```$/g, "").trim();

    let extracted;
    try {
      extracted = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        { error: "Couldn't read this document clearly. Try a clearer photo or enter the details manually." },
        { status: 422 }
      );
    }

    return NextResponse.json(extracted);
  } catch (err) {
    console.error("Document extraction failed:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Extraction failed: ${message}. You can still enter the details manually.` },
      { status: 500 }
    );
  }
}