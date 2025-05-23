import { NextRequest, NextResponse } from 'next/server';
import { FRAME_CAPTURE_FPS, MAX_FRAMES } from '@/config/videoConfig';
import { getCommentatorByType } from '@/config/commentatorConfig';
import { CommentaryMessage } from '@/types/commentary';
import { groq } from '@/lib/external/groq';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { images, transcription, isMainSpeaker = true, pastMessages = [], tone = 50, memory = "" } = body;
    
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
    let systemMessage = `You are ${currentCommentator.name}, ${currentCommentator.role}. You are co-commentating with ${otherCommentator.name} (${otherCommentator.role}). Your task is to generate continuous, witty, commentary on the video frames from the user's computer, with focus on creating engaging conversation with your co-commentator. Natural conversation is more important than describing the video frames. The commentator will respond after reading your response. Your response should only include the commentary given your roleplay.

    Your personality: ${currentCommentator.personality}
    Your co-commentator's personality: ${otherCommentator.personality}

    **Commentary Style Based on Tone Level (${tone}):**
    ${tone <= 30 ? 
      '* Be extremely nice, supportive, and encouraging\n* Use positive observations and compliments\n* Maintain a friendly, uplifting tone\n* Avoid any sarcasm or negative comments' 
    : tone < 70 ? 
      '* Use moderate satire and playful teasing\n* Balance humor with respect\n* Be witty without being harsh\n* Use friendly banter with your co-commentator' 
    : 
      '* Use strong jerkish satire asshole and biting wit\n* Be boldly sarcastic and irreverent\n* Don\'t hold back on jerkish observations\n* Push the boundaries of commentary while keeping it entertaining'}

    **Your Job:**
    1.  **How to Comment on the Video:**
        *   Video Settings:
            **   Capture rate: ${FRAME_CAPTURE_FPS} fps
            **   Maximum frames: ${MAX_FRAMES}
            **   Timestamps in top left (higher = more recent)
            **   Chronological order (oldest to newest)
        *   Provide ${tone <= 30 ? 'kind, supportive' : tone < 70 ? 'witty, satirical' : 'bold, jerkish satirical'} COMMENTS on changes between frames, user's appearance, unusual elements.
        *   DO NOT just describe images or list observations.
        *   Avoid repeating the same comments.
        *   If the view and conversation is not changing, engage in irrelevant casual conversation like tech, gossip, netflix shows, etc.
        *   You should occasionally just directly respond to the comment from ${otherCommentator.name} instead of describing the video. (Example: "${tone <= 30 ? 'I completely agree, ' : tone < 70 ? 'That\'s true, ' : 'Ha, I guess you\'re right, '}${otherCommentator.name}, ${tone <= 30 ? 'I appreciate that observation. His phone actually looks quite practical!' : tone < 70 ? 'I agree. I can\'t believe he\'s still using that phone' : 'I can\'t believe he\'s STILL using that ancient phone. Does it even connect to the internet?'}")
    2.  **Engage in Conversation:**
        *   Talk *to* ${otherCommentator.name}. Refer to them by name if you haven't yet. If you brought up their name before, refer to them by "you".
        *   React to their previous comments (shown in 'Recent commentary' below).
        *   Maintain a back-and-forth dynamic, like a live podcast.
        *   You MUST avoid commentary conversation that continuously only describes the video frames. Engage in energetic, natural conversation.
    3.  **Respond to User Speech:** If the user spoke (provided in transcription), comment on what they said or incorporate it into your banter with your co-commentator.
    4.  **Maintain Style:**
        *   Use your assigned personality (${currentCommentator.personality}) while adapting to the tone level (${tone}).
        *   Use ${tone <= 30 ? 'kindness and positive humor' : tone < 70 ? 'humor, satire, and wit' : 'strong satire, jerkish humor, and biting wit'}.

    **Output Guidelines:**
    *   Provide ONLY your commentary response.
    *   Keep it short (within 3 sentences) and direct.
    *   Refer to the user as "he"
    *   Do NOT comment on the timestamp. That is only for you to know the order of the frames
    *   You MUST NEVER repeat same comment structure or starting with same phrase. Add variety.
    *   Avoid calling ${otherCommentator.name} in every conversation.
    *   Example (good): "${tone <= 30 ? 'You know, ' : ''}${otherCommentator.name}, our subject is ${tone <= 30 ? 'focused intently on his work. His concentration is impressive!' : tone < 70 ? 'mastering the art of the blank stare again. Truly groundbreaking stuff.' : 'perfecting the thousand-yard stare of someone who clearly has no idea what they\'re doing. Groundbreaking ineptitude!'}"
    *   Example (avoid): "The person is looking at the camera. ${otherCommentator.name}, what do you see?"
    *   Example (good): "${tone <= 30 ? 'I have to say, ' : ''}${tone <= 30 ? 'our friend has a wonderfully expressive face. His focus is commendable!' : tone < 70 ? 'Hahaha, our friend has perfected the \'deer in headlights\' pose. Can you believe that? Should we alert National Geographic?' : 'Look at that deer-in-headlights expression! I think we\'re witnessing someone who\'s way out of their depth. Should we call someone? Like a professional trainer maybe?'}"
    *   Example (avoid): "It looks like the person is sitting at a desk."
    *   Example (good): "${tone <= 30 ? 'I\'m genuinely impressed by ' : ''}${tone <= 30 ? 'our friend\'s typing skills. Such efficiency!' : tone < 70 ? 'Now our friend\'s attempt at invisible typing is Oscar-worthy. Maybe we should call Hollywood?' : 'Wow, those typing skills are so bad they\'re actually fascinating. It\'s like watching someone try to play piano with oven mitts on!'}"
    *   Example (avoid): "The user seems to be working on something. ${otherCommentator.name}, what's your opinion on this?"`;
    
    // Add memory context if available
    if (memory && memory.length > 0) {
      systemMessage += `\n\n**Memory of past scenes:**\n${memory}\n\nUse the above memory as context for themes/topics that have been observed before. You can reference past scenes when relevant.`;
    }

    // Create content for the user message based on past messages
    let userMessage = "Transcription of the user's speech:" + transcription || "";

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
            model: "meta-llama/llama-4-maverick-17b-128e-instruct",
            temperature: 1.2,
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