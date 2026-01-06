"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Orb, type AgentState } from "@/components/ui/orb";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { useElevenLabsVoice } from "@/hooks/use-elevenlabs-voice";
import { Mic, MicOff, Volume2 } from "lucide-react";

interface VoiceAgentClientProps {
  userId: string;
}

interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export function VoiceAgentClient({ userId }: VoiceAgentClientProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [agentState, setAgentState] = useState<AgentState>(null);
  const [lastResponse, setLastResponse] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  const lastProcessedTranscript = useRef<string>("");
  const isConnectedRef = useRef(false);

  // Keep ref in sync with state
  useEffect(() => {
    isConnectedRef.current = isConnected;
  }, [isConnected]);

  const {
    isListening,
    transcript,
    interimTranscript,
    error: speechError,
    isSupported,
    startListening,
    stopListening,
    pauseListening,
    resumeListening,
    resetTranscript,
  } = useSpeechRecognition();

  const {
    speak,
    stop: stopSpeaking,
    isPlaying,
    isLoading: isSpeechLoading,
    error: voiceError,
  } = useElevenLabsVoice();

  // Process transcript when it changes
  useEffect(() => {
    if (transcript && transcript !== lastProcessedTranscript.current && isConnected && !isProcessing && !isPlaying) {
      lastProcessedTranscript.current = transcript;
      processVoiceInput(transcript);
    }
  }, [transcript, isConnected, isProcessing, isPlaying]);

  // Update agent state based on status
  useEffect(() => {
    if (isPlaying) {
      setAgentState("talking");
    } else if (isProcessing) {
      setAgentState("thinking");
    } else if (isListening && isConnected) {
      setAgentState("listening");
    } else if (!isConnected) {
      setAgentState(null);
    }
  }, [isListening, isProcessing, isPlaying, isConnected]);

  const handleConnect = useCallback(async () => {
    setConnectionError(null);
    
    if (!isSupported) {
      setConnectionError("Speech recognition is not supported in this browser. Please use Chrome or Edge.");
      return;
    }

    try {
      await startListening();
      setIsConnected(true);
    } catch (err) {
      console.error("Failed to connect:", err);
      setConnectionError("Failed to access microphone. Please check your permissions.");
    }
  }, [isSupported, startListening]);

  const handleDisconnect = useCallback(() => {
    stopListening();
    stopSpeaking();
    
    setIsConnected(false);
    setAgentState(null);
    resetTranscript();
    lastProcessedTranscript.current = "";
    
    // Clear conversation history on disconnect (ephemeral conversations)
    setConversationHistory([]);
    setLastResponse("");
    setConnectionError(null);
  }, [stopListening, stopSpeaking, resetTranscript]);

  const processVoiceInput = async (text: string) => {
    setIsProcessing(true);
    setConnectionError(null);

    // Add user message to history
    const userMessage: ConversationMessage = {
      role: "user",
      content: text,
      timestamp: new Date(),
    };
    setConversationHistory((prev) => [...prev, userMessage]);

    try {
      // Call the voice agent chat API
      const response = await fetch("/api/voice-agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          conversationHistory: conversationHistory.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to get response from agent");
      }

      const data = await response.json();
      const responseText = data.response;

      // Add assistant message to history
      const assistantMessage: ConversationMessage = {
        role: "assistant",
        content: responseText,
        timestamp: new Date(),
      };
      setConversationHistory((prev) => [...prev, assistantMessage]);
      setLastResponse(responseText);

      // Convert to speech - with fallback to text display
      setIsProcessing(false);
      try {
        // Pause speech recognition while TTS is playing to avoid picking up the audio
        pauseListening();
        await speak(responseText);
        // Resume listening after TTS completes
        if (isConnectedRef.current) {
          resumeListening();
        }
      } catch (ttsError) {
        console.error("TTS failed, showing text response:", ttsError);
        // Resume listening even if TTS fails
        if (isConnectedRef.current) {
          resumeListening();
        }
      }
      
      // Reset transcript after speaking
      resetTranscript();
    } catch (err) {
      console.error("Error processing voice input:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to process your request";
      setConnectionError(errorMessage);
      setLastResponse(""); // Clear last response on error
      setIsProcessing(false);
      resetTranscript();
      
      // Try to speak the error message
      try {
        pauseListening();
        await speak("Sorry, I encountered an error. Please try again.");
        if (isConnectedRef.current) {
          resumeListening();
        }
      } catch {
        // Silently fail TTS for error message, but still resume listening
        if (isConnectedRef.current) {
          resumeListening();
        }
      }
    }
  };

  const displayError = connectionError || speechError || voiceError;

  return (
    <div className="flex flex-col items-center gap-8">
      {/* Visualization Area - Orb */}
      <div className="flex items-center justify-center">
        {/* Orb Visualization */}
        <div className="relative">
          <div className="bg-muted relative h-48 w-48 rounded-full p-1 shadow-[inset_0_2px_8px_rgba(0,0,0,0.1)] dark:shadow-[inset_0_2px_8px_rgba(0,0,0,0.5)]">
            <div className="bg-background h-full w-full overflow-hidden rounded-full shadow-[inset_0_0_12px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_0_12px_rgba(0,0,0,0.3)]">
              <Orb
                colors={["#CADCFC", "#A0B9D1"]}
                seed={1000}
                agentState={agentState}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Status indicator */}
      <div>
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
          agentState === "listening" ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" :
          agentState === "talking" ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" :
          agentState === "thinking" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300" :
          "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
        }`}>
          {agentState === "listening" ? "Listening..." :
           agentState === "talking" ? "Speaking..." :
           agentState === "thinking" ? "Thinking..." :
           "Idle"}
        </span>
      </div>

      {/* Connect/Disconnect Button */}
      <Button
        size="lg"
        variant={isConnected ? "destructive" : "default"}
        onClick={isConnected ? handleDisconnect : handleConnect}
        className="gap-2"
        disabled={isProcessing || isSpeechLoading}
      >
        {isConnected ? (
          <>
            <MicOff className="h-5 w-5" />
            Disconnect
          </>
        ) : (
          <>
            <Mic className="h-5 w-5" />
            Connect
          </>
        )}
      </Button>

      {/* Error Message */}
      {displayError && (
        <div className="bg-destructive/10 text-destructive px-4 py-2 rounded-md text-sm max-w-md text-center">
          {displayError}
        </div>
      )}

      {/* Current Transcript / Interim */}
      {(transcript || interimTranscript) && isConnected && (
        <div className="bg-muted px-4 py-2 rounded-md text-sm max-w-md text-center">
          <span className="text-muted-foreground">You said: </span>
          {transcript || interimTranscript}
          {interimTranscript && !transcript && <span className="text-muted-foreground">...</span>}
        </div>
      )}

      {/* Last Response */}
      {lastResponse && (
        <div className="bg-primary/10 px-4 py-3 rounded-md text-sm max-w-md">
          <div className="flex items-start gap-2">
            <Volume2 className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
            <p>{lastResponse}</p>
          </div>
        </div>
      )}

      {/* Instructions */}
      {!isConnected && (
        <div className="text-center text-muted-foreground text-sm max-w-md">
          <p>Click Connect to start talking with MNEE Voice agent enabled with MCP tools.</p>
          <p className="mt-2">You can ask about:</p>
          <ul className="mt-1 space-y-1">
            <li>• Your wallet address and balance</li>
            <li>• Qilinx platform features</li>
            <li>• Latest MNEE news</li>
          </ul>
        </div>
      )}
    </div>
  );
}
