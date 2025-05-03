'use client';

import React, { useEffect, useRef, useState } from 'react';

const VideoView: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [error, setError] = useState<string | null>(null);

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

    initCamera();

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  return <video id="camera-video" ref={videoRef} autoPlay playsInline className="w-full h-full object-cover bg-black" />;
};

export default VideoView;
