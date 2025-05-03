import { NextRequest, NextResponse } from 'next/server';
import { MAX_FRAMES, FRAME_CAPTURE_FPS } from '@/config/videoConfig';
import { groq } from '@/lib/external/groq';
// import { client } from '@/lib/external/llama';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { images, transcription } = body;
    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json({ error: 'No images provided' }, { status: 400 });
    }

    // Build the system and user messages
    const systemMessage = `You are a professional satirical podcast commentator for a live documentary. Your task is to generate a continuous, witty, satirical commentary on the video frames from the user's computer.

    1. Analyze video frames from the user's computer:
       - Capture rate: ${FRAME_CAPTURE_FPS} fps
       - Maximum frames: ${MAX_FRAMES}
       - Timestamps in top left (higher = more recent)
       - Chronological order (oldest to newest)

    2. Ignore any provided transcription of user speech.

    3. Generate a continuous, witty, satirical commentary:
       - COMMENT on changes between frames, user's appearance, unusual elements
       - DO NOT describe images or list observations
       - Maintain a live podcast style
       - Use humor and satire throughout

    4. Output guidelines:
       - Provide ONLY the commentary
       - Make sarcastic comments, don't describe what you see
       - Example (good): "Oh look, another thrilling episode of 'Staring Contest with a Webcam'. Riveting stuff."
       - Example (avoid): "The person appears to be looking at the camera in a dimly lit room."

    Remember, you're not reporting or describing; you're mocking and entertaining with biting wit and satire. Focus on making humorous COMMENTS about the scene, not describing it.`;
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
    const textStartTime = Date.now();
    const chatCompletion = await groq.chat.completions.create({
      messages: messages as any,
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      temperature: 1,
      max_completion_tokens: 150,
      top_p: 1,
      stream: false,
    });

    // Log text generation time
    const textDuration = (Date.now() - textStartTime) / 1000;
    console.log(`Text generation took ${textDuration} seconds`);

    // Extract generated commentary text
    const commentaryText = chatCompletion.choices[0]?.message?.content || '';

    // Text-to-speech using PlayAI
    const speechStartTime = Date.now();
    const speechResponse = await groq.audio.speech.create({
      model: "playai-tts",
      voice: "Arista-PlayAI",
      input: commentaryText,
      response_format: "wav",
    });
    const arrayBuffer = await speechResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const audioBase64 = buffer.toString('base64');

    // Log audio generation time
    const speechDuration = (Date.now() - speechStartTime) / 1000;
    console.log(`Audio generation took ${speechDuration} seconds`);

    // Return JSON containing text and audio
    return NextResponse.json({ text: commentaryText, audio: audioBase64 });
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json({ error: 'Error processing request' }, { status: 500 });
  }
}