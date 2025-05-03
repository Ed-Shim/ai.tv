import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { MAX_FRAMES, FRAME_CAPTURE_FPS } from '@/config/videoConfig';

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { images, transcription } = body;
    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json({ error: 'No images provided' }, { status: 400 });
    }

    // Build the system and user messages
    const systemMessage = `You are a professional commentator analyzing frames captured from a video stream from the user's computer. These frames are taken at a rate of ${FRAME_CAPTURE_FPS} frames per second, with a maximum of ${MAX_FRAMES} most recent frames.
    
    Each frame has a timestamp overlay located at the top left; larger timestamp values indicate more recent frames. The images are provided in chronological order (oldest to newest) based on this timestamp. The user may have also provided a transcription of what they said. 
    
    Analyze these frames and the transcription to create a witty, satirical commentary about what you observe, focusing on changes between frames, the user's appearance, or anything unusual you notice. This is not a single joke. Talk as if you are making a continuous satire commentary of a live documentary of the video.
    
    Your response should only include the commentary, and nothing more.`;
    const messages = [
      { role: 'system', content: systemMessage },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: transcription
              ? `Here's what I said: "${transcription}". What do you think of these frames from my webcam?`
              : "What do you think of these frames from my webcam?",
          },
          ...images.map((image: string) => ({
            type: 'image_url',
            image_url: { url: image },
          })),
        ],
      },
    ];

    // Non-streaming chat completion
    const chatCompletion = await groq.chat.completions.create({
      messages: messages as any,
      model: "meta-llama/llama-4-maverick-17b-128e-instruct",
      temperature: 1,
      max_completion_tokens: 100,
      top_p: 1,
      stream: false,
    });

    // Extract generated commentary text
    const commentaryText = chatCompletion.choices[0]?.message?.content || '';

    // Text-to-speech using PlayAI
    const speechResponse = await groq.audio.speech.create({
      model: "playai-tts",
      voice: "Fritz-PlayAI",
      input: commentaryText,
      response_format: "wav",
    });
    const arrayBuffer = await speechResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const audioBase64 = buffer.toString('base64');

    // Return JSON containing text and audio
    return NextResponse.json({ text: commentaryText, audio: audioBase64 });
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json({ error: 'Error processing request' }, { status: 500 });
  }
}