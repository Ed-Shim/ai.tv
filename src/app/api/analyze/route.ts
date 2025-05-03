import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { MAX_FRAMES, FRAME_CAPTURE_FPS } from '@/config/videoConfig';

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    // Get request body
    const body = await request.json();
    const { images, transcription } = body;

    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json({ error: 'No images provided' }, { status: 400 });
    }

    // Create a system message explaining the context
    const systemMessage = `You are analyzing frames captured from a video stream from the user's computer. These frames are taken at a rate of ${FRAME_CAPTURE_FPS} frames per second, with a maximum of ${MAX_FRAMES} most recent frames. Each frame has a timestamp overlay located at the top right; larger timestamp values indicate more recent frames. The images are provided in chronological order (oldest to newest) based on this timestamp. The user may have also provided a transcription of what they said. Analyze these frames and the transcription to create a witty, satirical joke about what you observe, focusing on changes between frames, the user's appearance, or anything unusual you notice. Your response must only include the satire joke.`;

    // Prepare the messages for Groq API
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
            image_url: {
              url: image,
            },
          })),
        ],
      },
    ];

    // Create a new ReadableStream for streaming the response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const chatCompletion = await groq.chat.completions.create({
            messages: messages as any,
            model: "meta-llama/llama-4-maverick-17b-128e-instruct",
            temperature: 1,
            max_completion_tokens: 150,
            top_p: 1,
            stream: true,
          });

          // Handle the streaming response
          for await (const chunk of chatCompletion) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        } catch (error) {
          console.error('Error streaming response:', error);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: 'Error generating response' })}\n\n`)
          );
        } finally {
          controller.close();
        }
      },
    });

    // Return the stream as a response
    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json({ error: 'Error processing request' }, { status: 500 });
  }
}