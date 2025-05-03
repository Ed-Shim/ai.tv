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
       - Keep it short within 3 sentences and be direct. Don't keep talking.
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

    // Create a new response with a custom stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Step 1: Generate text response
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
          
          // Send the text response immediately to the client
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'text', content: commentaryText })}\n\n`));
          
          // Step 2: Generate audio (after text is sent)
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
          
          // Instead of streaming base64 chunks in JSON, we'll use a more reliable approach:
          // 1. Send a "prepare" message with audio metadata
          // 2. Send raw base64 chunks with minimal JSON wrapping
          // 3. Use a more controlled chunk size
          
          // First, notify client to prepare for audio data
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'audio_prepare',
            totalSize: audioBase64.length,
            format: 'wav'
          })}\n\n`));
          
          await new Promise(resolve => setTimeout(resolve, 10)); // Brief pause
          
          // Use a smaller chunk size for reliability
          const chunkSize = 10000; // Significantly smaller for reliability
          const totalChunks = Math.ceil(audioBase64.length / chunkSize);
          
          // Send chunks with minimal JSON structure
          for (let i = 0; i < audioBase64.length; i += chunkSize) {
            try {
              const chunk = audioBase64.substring(i, i + chunkSize);
              
              // Create a simpler message format that's less prone to JSON parsing issues
              const message = {
                type: 'audio_chunk',
                index: Math.floor(i / chunkSize),
                total: totalChunks,
                last: i + chunkSize >= audioBase64.length,
                // Encode the chunk to avoid special characters breaking JSON
                data: encodeURIComponent(chunk)
              };
              
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(message)}\n\n`));
              
              // Add a small delay between chunks to prevent overwhelming the client
              await new Promise(resolve => setTimeout(resolve, 5));
            } catch (chunkError) {
              console.error(`Error sending chunk ${Math.floor(i / chunkSize)}:`, chunkError);
            }
          }
          
          // Confirm audio transmission complete
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'audio_complete'
          })}\n\n`));
          
          // Signal completion
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        } catch (error) {
          console.error('Error processing request:', error);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: 'Error processing request' })}\n\n`)
          );
        } finally {
          controller.close();
        }
      }
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