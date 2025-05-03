import fs from "fs";
import path from "path";
import { tmpdir } from "os";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { groq } from "../../../lib/external/groq";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "Missing audio file" }, { status: 400 });
    }
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const tempFilePath = path.join(tmpdir(), file.name);
    await fs.promises.writeFile(tempFilePath, buffer);

    const transcription = await groq.audio.transcriptions.create({
      file: fs.createReadStream(tempFilePath),
      model: "whisper-large-v3-turbo",
    //   prompt: "Specify context or spelling",
      response_format: "json",
      language: "en",
    //   temperature: 1,
    });

    await fs.promises.unlink(tempFilePath);

    return new NextResponse(transcription.text, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  } catch (error) {
    console.error("Transcription error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}