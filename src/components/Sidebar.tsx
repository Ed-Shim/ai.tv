'use client';

import React, { useState, useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useFrameCapture } from '../hooks/useFrameCapture';
import { generateCommentary } from '../services/commentaryService';

interface SidebarProps {
  transcription?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ transcription = '' }) => {
  // Replace manual frame capture logic with a dedicated hook
  const frames = useFrameCapture();
  const [response, setResponse] = useState<string>('');
  const [isCommentaryGenerating, setIsCommentaryGenerating] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('input');

  const handleGenerateCommentary = () => {
    if (frames.length === 0) return;
    generateCommentary(frames.map(f => f.src), transcription, {
      onStart: () => {
        setIsCommentaryGenerating(true);
        setResponse('');
        setActiveTab('response');
      },
      onText: text => setResponse(text),
      onAudioStart: (size, format) => console.log(`Audio prepare: ${size} bytes, format ${format}`),
      onError: error => {
        console.error('Commentary error:', error);
        setResponse('Error generating commentary. Please try again.');
        setIsCommentaryGenerating(false);
      },
      onComplete: () => setIsCommentaryGenerating(false),
    });
  };

  return (
    <div className="h-full flex flex-col p-3">
      <div className="mb-2">
        <Button
          onClick={handleGenerateCommentary}
          disabled={isCommentaryGenerating || frames.length === 0}
          className="w-full"
        >
          {isCommentaryGenerating ? 'Generating Commentary...' : 'Generate Commentary'}
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
              {response && (
                <div className="whitespace-pre-wrap">{response}</div>
              )}
              {!response && (
                <div className="text-gray-400 italic">
                  Generate a commentary to see the AI's interpretation of your images and transcription.
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