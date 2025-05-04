// Configuration for video frame capture
export const MAX_FRAMES = 5;
export const FRAME_CAPTURE_FPS = 1;

//Configuration for chat api analytics
const SLIDING_OVERLAP_WINDOW = 2; //must be < MAX_FRAMES
export const SLIDING_INTERVAL_FRAME = MAX_FRAMES - SLIDING_OVERLAP_WINDOW;