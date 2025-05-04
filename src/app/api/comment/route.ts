import { NextRequest, NextResponse } from 'next/server';
import { FRAME_CAPTURE_FPS, MAX_FRAMES } from '@/config/videoConfig';
import { getCommentatorByType } from '@/config/commentatorConfig';
import { CommentaryMessage } from '@/types/commentary';
import { groq } from '@/lib/external/groq';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { images, transcription, isMainSpeaker = true, pastMessages = [] } = body;
    
    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json({ error: 'No images provided' }, { status: 400 });
    }

    // Get commentator personas
    const currentCommentator = getCommentatorByType(isMainSpeaker ? 'main' : 'assist');
    const otherCommentator = getCommentatorByType(isMainSpeaker ? 'assist' : 'main');

    // Format past messages for context
    const formattedPastMessages = (pastMessages as CommentaryMessage[])
      .slice(-10) // Only include the most recent 5 messages
      .map(msg => {
        const speakerType = msg.isMainSpeaker ? 'main' : 'assist';
        const persona = getCommentatorByType(speakerType);
        return `${persona.name} (${persona.role}): ${msg.content}`;
      })
      .join('\n');

    // Build the system and user messages
    const systemMessage = `You are ${currentCommentator.name}, ${currentCommentator.role}. You are co-commentating with ${otherCommentator.name} (${otherCommentator.role}). Your task is to generate continuous, witty, satirical commentary on the video frames from the user's computer, while engaging in a conversation with your co-commentator. The commentator will respond after reading your response. Your response should only include the commentary given your roleplay.

    Your personality: ${currentCommentator.personality}
    Your co-commentator's personality: ${otherCommentator.personality}

    **Your Job:**
    1.  **Analyze Video Frames:**
        *   Capture rate: ${FRAME_CAPTURE_FPS} fps
        *   Maximum frames: ${MAX_FRAMES}
        *   Timestamps in top left (higher = more recent)
        *   Chronological order (oldest to newest)
    2.  **Engage in Conversation:**
        *   Talk *to* ${otherCommentator.name}. Refer to them by name if you haven't yet. If you brought up their name before, refer to them by "you".
        *   React to their previous comments (shown in 'Recent commentary' below).
        *   Maintain a back-and-forth dynamic, like a live podcast.
    3.  **Comment on Video:**
        *   Provide witty, satirical COMMENTS on changes between frames, user's appearance, unusual elements.
        *   DO NOT just describe images or list observations.
        *   If the view is not changing, you may engage in irrelevant casual conversation like tech, gossip, netflix shows, etc.
    4.  **Ignore Transcription:** Pay no attention to any provided transcription of user speech.
    5.  **Maintain Style:**
        *   Use your assigned personality (${currentCommentator.personality}).
        *   Use humor, satire, and biting wit.

    **Output Guidelines:**
    *   Provide ONLY your commentary response.
    *   Keep it short (within 3 sentences) and direct.
    *   Focus on making sarcastic or humorous comments about the scene and the ongoing conversation.
    *   Refer to the user as "he"
    *   Example (good): "Well, ${otherCommentator.name}, looks like our subject is mastering the art of the blank stare again. Truly groundbreaking stuff."
    *   Example (avoid): "The person is looking at the camera. ${otherCommentator.name}, what do you see?"`;

    // Create content for the user message based on past messages
    let userMessage = transcription
      ? `Here's what I said: "${transcription}". What do you think of these frames from my webcam?`
      : "What do you think of these frames from my webcam?";

    // Add past messages context if available
    if (formattedPastMessages.length > 0) {
      userMessage = `${userMessage}\n\nRecent commentary:\n${formattedPastMessages}`;
    }

    const messages = [
      { role: 'system', content: systemMessage },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: userMessage,
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
            max_completion_tokens: 100,
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
          
          // Step 2: Generate audio (after text is sent) using the appropriate voice
          const speechStartTime = Date.now();
          const speechResponse = await groq.audio.speech.create({
            model: "playai-tts",
            voice: currentCommentator.voice,
            input: commentaryText,
            response_format: "wav",
          });

          const arrayBuffer = await speechResponse.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const audioBase64 = buffer.toString('base64');

          // Log audio generation time
          const speechDuration = (Date.now() - speechStartTime) / 1000;
          console.log(`Audio generation took ${speechDuration} seconds`);
          
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
          
          // Variable to track if we've encountered any errors
          let hasEncounteredError = false;
          
          // Send chunks with minimal JSON structure
          for (let i = 0; i < audioBase64.length; i += chunkSize) {
            try {
              if (hasEncounteredError) break; // Skip remaining chunks if an error occurred
              
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
              
              // Check if controller is still usable
              try {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(message)}\n\n`));
              } catch (enqueueError) {
                console.error('Controller error during chunk enqueue:', enqueueError);
                hasEncounteredError = true;
                break;
              }
              
              // Add a small delay between chunks to prevent overwhelming the client
              await new Promise(resolve => setTimeout(resolve, 5));
            } catch (chunkError) {
              console.error(`Error sending chunk ${Math.floor(i / chunkSize)}:`, chunkError);
              hasEncounteredError = true;
              break;
            }
          }
          
          // Only try to send completion messages if we haven't encountered errors
          if (!hasEncounteredError) {
            try {
              // Confirm audio transmission complete
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'audio_complete'
              })}\n\n`));
              
              // Signal completion
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            } catch (finalizeError) {
              console.error('Error during stream finalization:', finalizeError);
            }
          }
        } catch (error) {
          console.error('Error processing request:', error);
          try {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ error: 'Error processing request' })}\n\n`)
            );
          } catch (enqueueError) {
            console.error('Error sending error message:', enqueueError);
          }
        } finally {
          try {
            controller.close();
          } catch (closeError) {
            console.error('Error closing controller:', closeError);
          }
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