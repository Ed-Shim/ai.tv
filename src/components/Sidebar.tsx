'use client';

import React, { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useFrameCapture } from '@/hooks/useFrameCapture';
import { useCommentarySystem } from '@/hooks/useCommentarySystem';
import CommentaryControls from './commentary/CommentaryControls';
import MessageList from './commentary/MessageList';
import FrameDisplay from './commentary/FrameDisplay';

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
  
  // Use our custom hook for managing commentary system
  const commentary = useCommentarySystem(frames, {
    transcription,
    onTabChange: setActiveTab
  });

  return (
    <div className="h-full flex flex-col p-3">
      {/* Commentary control buttons */}
      <CommentaryControls 
        isGenerating={commentary.isGenerating}
        isContinuous={commentary.isContinuous}
        hasFrames={frames.length > 0}
        onGenerate={commentary.generateMainCommentary}
        onToggleContinuous={commentary.toggleContinuous}
      />
      
      {/* Tabs for input and response */}
      <Tabs defaultValue="input" value={activeTab} onValueChange={setActiveTab} className="w-full h-full">
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="input">Input</TabsTrigger>
          <TabsTrigger value="response">Response</TabsTrigger>
        </TabsList>
        
        {/* Input tab - display frames and transcription */}
        <TabsContent value="input" className="h-full flex flex-col">
          <FrameDisplay 
            frames={frames}
            transcription={transcription}
          />
        </TabsContent>
        
        {/* Response tab - display commentary messages */}
        <TabsContent value="response" className="h-full">
          <MessageList messages={commentary.messages} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Sidebar;