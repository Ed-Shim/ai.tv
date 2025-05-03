'use client';

import React, { useEffect, useState, useRef } from 'react';
import { MAX_FRAMES, FRAME_CAPTURE_FPS } from '../config/videoConfig';

// Helper to format time as mm:ss:cc
const pad2 = (n: number) => n.toString().padStart(2, '0');
const formatTime = (timeInSec: number): string => {
  const minutes = Math.floor(timeInSec / 60);
  const seconds = Math.floor(timeInSec % 60);
  const decimals = Math.floor((timeInSec - Math.floor(timeInSec)) * 100);
  return `${pad2(minutes)}:${pad2(seconds)}:${pad2(decimals)}`;
};

interface Frame {
  src: string;
  timestamp: number;
}

const Sidebar: React.FC = () => {
  const [time, setTime] = useState<number>(0);
  const [frames, setFrames] = useState<Frame[]>([]);
  const timeRef = useRef<number>(0);

  useEffect(() => {
    const intervalMs = 1000 / FRAME_CAPTURE_FPS;
    let cancelled = false;
    let timerId: number;
    
    const updateTime = () => {
      if (cancelled) return;
      
      const newTime = timeRef.current + intervalMs / 1000;
      timeRef.current = newTime;
      setTime(newTime);
      
      // Always capture a frame every second
      captureFrame(newTime);
      
      timerId = window.setTimeout(updateTime, intervalMs);
    };
    
    const captureFrame = (currentTime: number) => {
      const video = document.getElementById('camera-video') as HTMLVideoElement | null;
      if (!video || video.readyState !== 4) return;
      
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) return;
      
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Overlay timestamp onto frame
      const text = formatTime(currentTime);
      const fontSize = Math.round(canvas.height * 0.05);
      ctx.font = `bold ${fontSize}px sans-serif`;
      const textWidth = ctx.measureText(text).width;
      const padding = fontSize * 0.2;
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, textWidth + padding * 2, fontSize + padding * 2);
      ctx.fillStyle = 'black';
      ctx.fillText(text, padding, fontSize + padding);
      
      // Convert to JPEG and release canvas resources
      const dataUrl = canvas.toDataURL('image/jpeg');
      
      setFrames(prevFrames => {
        const newFrames = [{ src: dataUrl, timestamp: currentTime }, ...prevFrames];
        return newFrames.slice(0, MAX_FRAMES);
      });
      
      // Log memory usage
      if (performance && (performance as any).memory) {
        const { usedJSHeapSize, totalJSHeapSize } = (performance as any).memory;
        console.log(`JS Heap: ${Math.round(usedJSHeapSize/1024/1024)}MB / ${Math.round(totalJSHeapSize/1024/1024)}MB`);
      }
    };
    
    // Start the timer immediately
    timerId = window.setTimeout(updateTime, intervalMs);
    
    return () => {
      cancelled = true;
      clearTimeout(timerId);
    };
  }, []);

  return (
    <div className="p-4 overflow-auto">
      <div className="space-y-4">
        {frames.map((frame, idx) => (
          <div key={idx} className="w-full h-auto">
            <img
              src={frame.src}
              alt={`Frame at ${frame.timestamp}s`}
              className="w-full object-cover"
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default Sidebar;
