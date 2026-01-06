"use client";

import { useState, useCallback, useRef } from "react";

export interface UseElevenLabsVoiceReturn {
  speak: (text: string, voiceId?: string) => Promise<HTMLAudioElement | null>;
  stop: () => void;
  isPlaying: boolean;
  isLoading: boolean;
  error: string | null;
  audioElement: HTMLAudioElement | null;
}

export function useElevenLabsVoice(): UseElevenLabsVoiceReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const speak = useCallback(async (text: string, voiceId?: string): Promise<HTMLAudioElement | null> => {
    // Stop any currently playing audio
    stop();
    
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/voice-agent/speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice_id: voiceId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to generate speech");
      }

      const data = await response.json();

      // Convert base64 to audio blob
      const audioData = atob(data.audio_data);
      const audioArray = new Uint8Array(audioData.length);
      for (let i = 0; i < audioData.length; i++) {
        audioArray[i] = audioData.charCodeAt(i);
      }

      const audioBlob = new Blob([audioArray], { type: data.content_type });
      const audioUrl = URL.createObjectURL(audioBlob);
      audioUrlRef.current = audioUrl;

      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      // Track if playback started successfully
      let playbackStarted = false;

      // Set up event handlers
      audio.onplay = () => {
        playbackStarted = true;
        setIsPlaying(true);
        // Clear any previous errors since playback is working
        setError(null);
      };

      audio.onended = () => {
        setIsPlaying(false);
        if (audioUrlRef.current) {
          URL.revokeObjectURL(audioUrlRef.current);
          audioUrlRef.current = null;
        }
      };

      audio.onerror = () => {
        // Only show error if playback never started
        if (!playbackStarted) {
          setError("Failed to play audio");
        }
        setIsPlaying(false);
        if (audioUrlRef.current) {
          URL.revokeObjectURL(audioUrlRef.current);
          audioUrlRef.current = null;
        }
      };

      // Start playback
      await audio.play();
      
      return audio;
    } catch (err) {
      console.error("Speech error:", err);
      setError(err instanceof Error ? err.message : "Failed to generate speech");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [stop]);

  return {
    speak,
    stop,
    isPlaying,
    isLoading,
    error,
    audioElement: audioRef.current,
  };
}
