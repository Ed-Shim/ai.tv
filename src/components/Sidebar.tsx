'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useFrameCapture } from '@/hooks/useFrameCapture';
import { useCommentarySystem } from '@/hooks/useCommentarySystem';
import CommentaryControls from './commentary/CommentaryControls';
import MessageList from './commentary/MessageList';
import FrameDisplay from './commentary/FrameDisplay';
import ChatList from './chat/ChatList';
import StatsView from './chat/StatsView';
import MemoryList from './chat/MemoryList';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { SLIDING_INTERVAL_FRAME } from '@/config/videoConfig';
import { fetchChatResponse, ChatMessage, ChatStatistics } from '@/services/chatService';
import { Card } from '@/components/ui/card';

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
  
  // Track new message updates when user is on a different tab
  const [lastCommentaryCount, setLastCommentaryCount] = useState<number>(0);
  const [lastChatCount, setLastChatCount] = useState<number>(0);
  
  // Development mode state
  const [isDevelopmentMode, setIsDevelopmentMode] = useState<boolean>(true);
  
  // Function to handle development mode toggle
  const handleDevelopmentModeChange = (newMode: boolean) => {
    // If switching off dev mode and current tab is dev-only, switch to a safe tab
    if (!newMode && (activeTab === 'input' || activeTab === 'stats' || activeTab === 'memory')) {
      setActiveTab('commentary');
    }
    setIsDevelopmentMode(newMode);
  };
  
  // Chat system state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [statistics, setStatistics] = useState<ChatStatistics>({
    gender: { male: 0, female: 0, unknown: 0 },
    interestLevel: { high: 0, mid: 0, low: 0 }
  });
  const [memories, setMemories] = useState<string[]>([]);
  
  // Custom tab change handler to ensure we don't switch to hidden tabs
  const handleTabChange = (newTab: string) => {
    // Only allow switching to dev-only tabs if dev mode is enabled
    if ((newTab === 'input' || newTab === 'stats' || newTab === 'memory') && !isDevelopmentMode) {
      // Default to commentary tab if trying to access a dev tab when dev mode is off
      setActiveTab('commentary');
    } else {
      setActiveTab(newTab);
    }
  };

  // Use our custom hook for managing commentary system
  const commentary = useCommentarySystem(frames, {
    transcription,
    // Remove automatic tab switching when commentary is generated
    onTabChange: undefined,
    developmentMode: isDevelopmentMode
  });

  // Chat streaming logic: call /api/chat every SLIDING_INTERVAL_FRAME new frames
  const slidingCountRef = useRef<number>(0);
  const lastFrameTimestampRef = useRef<number | undefined>(undefined);

  // Reset counters when streaming stops
  useEffect(() => {
    if (!commentary.isContinuous) {
      slidingCountRef.current = 0;
      lastFrameTimestampRef.current = undefined;
    }
  }, [commentary.isContinuous]);
  
  // Track new commentary messages
  useEffect(() => {
    // If there are new messages and user isn't on the commentary tab
    if (commentary.messages.length > lastCommentaryCount && activeTab !== 'commentary') {
      // Visual indicator is handled in the JSX
    }
    // Update the last seen count when actively viewing the commentary tab
    if (activeTab === 'commentary') {
      setLastCommentaryCount(commentary.messages.length);
    }
  }, [commentary.messages.length, activeTab, lastCommentaryCount]);
  
  // Track new chat messages
  useEffect(() => {
    // Update the last seen count when actively viewing the chat tab
    if (activeTab === 'chat') {
      setLastChatCount(chatMessages.length);
    }
  }, [chatMessages.length, activeTab]);

  // Trigger chat API call at sliding interval
  useEffect(() => {
    if (!commentary.isContinuous || frames.length === 0) return;
    const latestTimestamp = frames[0].timestamp;
    if (latestTimestamp === lastFrameTimestampRef.current) return;
    lastFrameTimestampRef.current = latestTimestamp;
    slidingCountRef.current++;
    if (slidingCountRef.current % SLIDING_INTERVAL_FRAME !== 0) return;
    
    (async () => {
      try {
        const { messages, statistics, memory } = await fetchChatResponse(
          frames.map(frame => frame.src)
        );
        
        // Update chat messages
        if (messages.length > 0) {
          setChatMessages(prevMessages => [...prevMessages, ...messages]);
        }
        
        // Update statistics
        setStatistics(prevStats => ({
          gender: {
            male: prevStats.gender.male + statistics.gender.male,
            female: prevStats.gender.female + statistics.gender.female,
            unknown: prevStats.gender.unknown + statistics.gender.unknown
          },
          interestLevel: {
            high: prevStats.interestLevel.high + statistics.interestLevel.high,
            mid: prevStats.interestLevel.mid + statistics.interestLevel.mid,
            low: prevStats.interestLevel.low + statistics.interestLevel.low
          }
        }));
        
        // Update memories
        if (memory) {
          setMemories(prevMemories => [...prevMemories, memory]);
        }
      } catch (error) {
        console.error('Chat streaming error:', error);
      }
    })();
  }, [frames, commentary.isContinuous]);

  return (
    <div className="h-full flex flex-col p-3">
      {/* Commentary control buttons */}
      <CommentaryControls 
        isGenerating={commentary.isGenerating}
        isContinuous={commentary.isContinuous}
        hasFrames={frames.length > 0}
        onToggleContinuous={commentary.toggleContinuous}
      />
      
      {/* Tabs for all content */}
      <Tabs defaultValue="input" value={activeTab} onValueChange={handleTabChange} className="w-full h-[calc(100%-36px)]">
        <div className="overflow-x-auto h-9 min-h-[36px] mb-2">
          <TabsList className="flex w-max">
            {isDevelopmentMode && <TabsTrigger className="text-xs px-3" value="input">Input</TabsTrigger>}
            <TabsTrigger className="text-xs px-3" value="settings">Settings</TabsTrigger>
            {isDevelopmentMode && <TabsTrigger className="text-xs px-3" value="stats">Stats</TabsTrigger>}
            {isDevelopmentMode && <TabsTrigger className="text-xs px-3" value="memory">Memory</TabsTrigger>}
            <TabsTrigger className="text-xs px-3 relative" value="commentary">
              Commentary
              {commentary.messages.length > lastCommentaryCount && activeTab !== 'commentary' && (
                <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-blue-500" />
              )}
            </TabsTrigger>
            <TabsTrigger className="text-xs px-3 relative" value="chat">
              Chat
              {chatMessages.length > lastChatCount && activeTab !== 'chat' && (
                <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-blue-500" />
              )}
            </TabsTrigger>
          </TabsList>
        </div>
        
        {/* Input tab - display frames and transcription */}
        {isDevelopmentMode && (
          <TabsContent value="input" className="h-full flex flex-col">
            <FrameDisplay 
              frames={frames}
              transcription={transcription}
            />
          </TabsContent>
        )}
        
        {/* Commentary tab - display commentary messages */}
        <TabsContent value="commentary" className="h-full">
          <MessageList messages={commentary.messages} />
        </TabsContent>
        
        {/* Chat tab - display chat messages */}
        <TabsContent value="chat" className="h-full">
          <ChatList messages={chatMessages} />
        </TabsContent>
        
        {/* Stats tab - display statistics */}
        <TabsContent value="stats" className="h-full">
          <StatsView statistics={statistics} />
        </TabsContent>
        
        {/* Memory tab - display memories */}
        <TabsContent value="memory" className="h-full">
          <MemoryList memories={memories} />
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
            <Switch checked={isDevelopmentMode} onCheckedChange={handleDevelopmentModeChange} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Sidebar;