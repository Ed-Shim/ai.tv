import { useState, useEffect, useRef } from 'react';
import { MAX_FRAMES, FRAME_CAPTURE_FPS } from '../config/videoConfig';

export interface Frame {
  src: string;
  timestamp: number;
}

/**
 * Hook to capture frames from a <video id="camera-video" /> element at a fixed FPS.
 * Returns an array of recent frames (as data URLs) with timestamps.
 */
export function useFrameCapture(): Frame[] {
  const [frames, setFrames] = useState<Frame[]>([]);
  const timeRef = useRef<number>(0);

  useEffect(() => {
    const intervalMs = 1000 / FRAME_CAPTURE_FPS;
    let cancelled = false;
    let timerId: number;

    const capture = () => {
      const video = document.getElementById('camera-video') as HTMLVideoElement | null;
      if (!video || video.readyState !== 4) return;

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Overlay timestamp
      const timestamp = Date.now();
      const text = timestamp.toString();
      const fontSize = Math.round(canvas.height * 0.05);
      ctx.font = `bold ${fontSize}px sans-serif`;
      const textWidth = ctx.measureText(text).width;
      const padding = fontSize * 0.2;
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, textWidth + padding * 2, fontSize + padding * 2);
      ctx.fillStyle = 'black';
      ctx.fillText(text, padding, fontSize + padding);

      const dataUrl = canvas.toDataURL('image/jpeg');
      setFrames(prev => {
        const next = [{ src: dataUrl, timestamp }, ...prev];
        return next.slice(0, MAX_FRAMES);
      });
    };

    const step = () => {
      if (cancelled) return;
      timeRef.current += intervalMs / 1000;
      capture();
      timerId = window.setTimeout(step, intervalMs);
    };

    timerId = window.setTimeout(step, intervalMs);
    return () => {
      cancelled = true;
      clearTimeout(timerId);
    };
  }, []);

  return frames;
}
