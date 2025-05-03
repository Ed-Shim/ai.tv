'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import { PiMicrophone, PiMicrophoneSlash, PiVideoCamera, PiVideoCameraSlash } from 'react-icons/pi';
import { toast } from 'sonner';
import { Toaster as SonnerToaster } from '@/components/ui/sonner';

interface VideoViewProps {
  onTranscriptionChange?: (transcription: string) => void;
}

const VideoView: React.FC<VideoViewProps> = ({ onTranscriptionChange }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [videoOn, setVideoOn] = useState<boolean>(true);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [transcription, setTranscription] = useState<string>('');
  const [responseTime, setResponseTime] = useState<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    let activeStream: MediaStream;

    const initCamera = async () => {
      try {
        activeStream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = activeStream;
        }
      } catch (err) {
        console.error('Error accessing camera:', err);
        setError('Unable to access camera. Please allow camera permissions.');
      }
    };

    if (videoOn) {
      initCamera();
    }

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
      }
    };
  }, [videoOn]);

  // Update parent component when transcription changes
  useEffect(() => {
    if (onTranscriptionChange) {
      onTranscriptionChange(transcription);
    }
  }, [transcription, onTranscriptionChange]);

  const handleRecordStart = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };
      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Error accessing microphone:', err);
    }
  };

  const handleRecordStop = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.onstop = async () => {
        const startTime = Date.now();
        const blob = new Blob(audioChunksRef.current, { type: audioChunksRef.current[0]?.type || 'audio/webm' });
        const formData = new FormData();
        formData.append('file', blob, 'recording.webm');

        try {
          const response = await fetch('/api/transcript', { method: 'POST', body: formData });
          const text = await response.text();
          const duration = Date.now() - startTime;
          setTranscription(text);
          setResponseTime(duration);
          toast.success(`${text} (${duration}ms)`);
        } catch (error) {
          console.error('Transcription failed:', error);
          toast.error('Transcription failed');
        } finally {
          audioChunksRef.current = [];
          if (audioStreamRef.current) {
            audioStreamRef.current.getTracks().forEach((track) => track.stop());
          }
        }
      };
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  return (
    <div className="relative w-full h-full">
      <video id="camera-video" ref={videoRef} autoPlay playsInline className="w-full h-full object-cover bg-black" />
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-4 z-10">
        <Button variant="default" size="icon" className="bg-white/70 hover:bg-white/90 hover:text-gray-800 active:text-black" onMouseDown={handleRecordStart} onMouseUp={handleRecordStop}>
          {isRecording ? <PiMicrophone size={24} /> : <PiMicrophoneSlash size={24} />}
        </Button>
        <Toggle pressed={videoOn} onPressedChange={setVideoOn} variant="default" className="bg-white/70 hover:bg-white/90">
          {videoOn ? (
            <PiVideoCamera size={24} />
          ) : (
            <PiVideoCameraSlash size={24} />
          )}
        </Toggle>
      </div>
      <SonnerToaster />
    </div>
  );
};

export default VideoView;