'use client';

import { useState } from 'react';
import VideoView from '../components/VideoView';
import Sidebar from '../components/Sidebar';

export default function Home() {
  const [transcription, setTranscription] = useState<string>('');
  
  const handleTranscriptionChange = (text: string) => {
    setTranscription(text);
  };

  return (
    <div className="flex flex-col md:flex-row h-screen">
      <div className="flex-1">
        <VideoView onTranscriptionChange={handleTranscriptionChange} />
      </div>
      <div className="w-full md:w-[350px] mt-4 md:mt-0 bg-gray-100 h-full overflow-auto">
        <Sidebar transcription={transcription} />
      </div>
    </div>
  );
}