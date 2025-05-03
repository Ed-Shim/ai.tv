'use client';

import React, { useEffect, useState, useRef } from 'react';
import { MAX_FRAMES, FRAME_CAPTURE_FPS } from '../config/videoConfig';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

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

interface SidebarProps {
  transcription?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ transcription = '' }) => {
  const [time, setTime] = useState<number>(0);
  const [frames, setFrames] = useState<Frame[]>([]);
  const [response, setResponse] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('input');
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
      
      // Overlay current timestamp in integer format onto frame
      const currentTimestamp = Math.floor(Date.now());
      const text = currentTimestamp.toString();
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
        const newFrames = [{ src: dataUrl, timestamp: Math.floor(Date.now()) }, ...prevFrames];
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

  const handleGenerate = async () => {
    if (frames.length === 0) return;
    
    try {
      setIsGenerating(true);
      setResponse('');
      setActiveTab('response');
      
      // Prepare data to send to the API
      const imagesData = frames.map(frame => frame.src);
      
      // Send the request to the API endpoint
      const startTime = Date.now();
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          images: imagesData,
          transcription,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate response');
      }
      
      // Handle streaming response
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');
      
      const decoder = new TextDecoder();
      
      let accumulatedResponse = '';
      
      // Process the stream data
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        // Decode the chunk
        const chunk = decoder.decode(value, { stream: true });
        
        // Parse the SSE data
        const lines = chunk.split('\n\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.substring(6);
            if (data === '[DONE]') {
              break;
            }
            
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                accumulatedResponse += parsed.content;
                setResponse(accumulatedResponse);
              }
            } catch (e) {
              console.error('Error parsing JSON:', e);
            }
          }
        }
      }
      const endTime = Date.now();
      console.log(`Analyze took ${endTime - startTime}ms`);
    } catch (error) {
      console.error('Error generating response:', error);
      setResponse('Error generating response. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="h-full flex flex-col p-3">
      <div className="mb-2">
        <Button
          onClick={handleGenerate}
          disabled={isGenerating || frames.length === 0}
          className="w-full"
        >
          {isGenerating ? 'Generating...' : 'Generate Response'}
        </Button>
      </div>
      <Tabs defaultValue="input" value={activeTab} onValueChange={setActiveTab} className="w-full h-full">
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="input">Input</TabsTrigger>
          <TabsTrigger value="response">Response</TabsTrigger>
        </TabsList>
        
        <TabsContent value="input" className="h-full flex flex-col">
          {transcription && (
            <div className="p-2 mb-4 bg-gray-50 rounded border">
              <p className="text-sm">{transcription}</p>
            </div>
          )}
          <ScrollArea className="flex-grow">
            <div className="space-y-4 p-1">
              {frames.map((frame, idx) => (
                <div key={idx} className="w-full h-auto">
                  <img
                    src={frame.src}
                    alt={`Frame at timestamp ${frame.timestamp}`}
                    className="w-full object-cover"
                  />
                </div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
        
        <TabsContent value="response" className="h-full">
          <ScrollArea className="h-full">
            <div className="p-4">
              {isGenerating && !response && (
                <div className="animate-pulse">Generating response...</div>
              )}
              {response && (
                <div className="whitespace-pre-wrap">{response}</div>
              )}
              {!isGenerating && !response && (
                <div className="text-gray-400 italic">
                  Generate a response to see the AI's interpretation of your images and transcription.
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Sidebar;