'use client';

import React, { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useFrameCapture } from '@/hooks/useFrameCapture';
import { useCommentarySystem } from '@/hooks/useCommentarySystem';
import CommentaryControls from './commentary/CommentaryControls';
import MessageList from './commentary/MessageList';
import FrameDisplay from './commentary/FrameDisplay';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';

interface SidebarProps {
  transcription?: string;
}

/**
 * Sidebar component for displaying frames and commentary
 */
const Sidebar: React.FC<SidebarProps> = ({ transcription = '' }) => {
  // Get captured frames
  const frames = useFrameCapture();
  
  // Tab navigation state
  const [activeTab, setActiveTab] = useState<string>('input');
  
  // Development mode state
  const [isDevelopmentMode, setIsDevelopmentMode] = useState<boolean>(true);
  
  // Use our custom hook for managing commentary system
  const commentary = useCommentarySystem(frames, {
    transcription,
    onTabChange: setActiveTab,
    developmentMode: isDevelopmentMode
  });

  return (
    <div className="h-full flex flex-col p-3">
      {/* Commentary control buttons */}
      <CommentaryControls 
        isGenerating={commentary.isGenerating}
        isContinuous={commentary.isContinuous}
        hasFrames={frames.length > 0}
        onToggleContinuous={commentary.toggleContinuous}
      />
      
      {/* Tabs for input and response */}
      <Tabs defaultValue="input" value={activeTab} onValueChange={setActiveTab} className="w-full h-[calc(100%-80px)]">
        <TabsList className="w-full grid grid-cols-3 flex-grow-0">
          {isDevelopmentMode && <TabsTrigger className="text-xs" value="input">Input</TabsTrigger>}
          <TabsTrigger className="text-xs" value="commentary">Commentary</TabsTrigger>
          <TabsTrigger className="text-xs" value="settings">Settings</TabsTrigger>
        </TabsList>
        
        {/* Input tab - display frames and transcription */}
        {isDevelopmentMode && (
          <TabsContent value="input" className="h-full flex flex-col">
            <FrameDisplay 
              frames={frames}
              transcription={transcription}
            />
          </TabsContent>
        )}
        
        {/* Response tab - display commentary messages */}
        <TabsContent value="commentary" className="h-full">
          <MessageList messages={commentary.messages} />
        </TabsContent>
        
        {/* Settings tab - display settings */}
        <TabsContent value="settings" className="h-full flex flex-col p-4 space-y-4">
          <div className="flex flex-col space-y-1">
            <span className="text-xs select-none text-stone-500">Commentary tone</span>
            <Slider value={[commentary.tone]} onValueChange={values => commentary.setTone(values[0])} min={0} max={100} />
            <div className="flex justify-between text-xs">
              <span>Friendly</span>
              <span>Satire</span>
            </div>
          </div>
          <div className="flex flex-col items-start gap-y-2">
            <span className="text-xs select-none text-stone-500">Development Mode</span>
            <Switch checked={isDevelopmentMode} onCheckedChange={setIsDevelopmentMode} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Sidebar;