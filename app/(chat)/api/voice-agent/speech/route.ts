import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { ChatSDKError } from "@/lib/errors";

interface SpeechRequest {
  text: string;
  voiceId?: string;
}

// Default voice: George (British male, young adult)
const DEFAULT_VOICE_ID = "JBFqnCBsd6RMkjVDRZzb";
const MODEL_ID = "eleven_flash_v2_5";

/**
 * Abbreviate wallet addresses and transaction hashes for voice output
 * Keeps the text display-friendly while making it easier to listen to
 */
function abbreviateAddressesForSpeech(text: string): string {
  // Match Ethereum addresses (0x followed by 40 hex chars)
  const ethAddressRegex = /0x[a-fA-F0-9]{40}/g;
  
  // Match BSV addresses (typically 25-34 chars, starting with 1 or 3)
  const bsvAddressRegex = /\b[13][a-km-zA-HJ-NP-Z1-9]{24,33}\b/g;
  
  // Match transaction hashes (64 hex chars, with or without 0x prefix)
  const txHashRegex = /\b(0x)?[a-fA-F0-9]{64}\b/g;

  let result = text;

  // Abbreviate Ethereum addresses: 0x1234...5678
  result = result.replace(ethAddressRegex, (match) => {
    return `${match.slice(0, 6)}...${match.slice(-4)}`;
  });

  // Abbreviate BSV addresses: 18ebEY...vQZQ
  result = result.replace(bsvAddressRegex, (match) => {
    if (match.length > 12) {
      return `${match.slice(0, 6)}...${match.slice(-4)}`;
    }
    return match;
  });

  // Abbreviate transaction hashes: mention just the ending
  result = result.replace(txHashRegex, (match) => {
    const hash = match.startsWith("0x") ? match : `0x${match}`;
    return `transaction ending in ${hash.slice(-4)}`;
  });

  return result;
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return new ChatSDKError("unauthorized:chat").toResponse();
    }

    const body: SpeechRequest = await request.json();
    const { text, voiceId = DEFAULT_VOICE_ID } = body;

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "Text is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "ElevenLabs API key not configured" },
        { status: 500 }
      );
    }

    // Abbreviate addresses for speech (keeps original in text response)
    const speechText = abbreviateAddressesForSpeech(text);

    // Call ElevenLabs TTS API
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": apiKey,
        },
        body: JSON.stringify({
          text: speechText,
          model_id: MODEL_ID,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.8,
            style: 0.2,
            use_speaker_boost: false,
          },
        }),
      }
    );

    if (!response.ok) {
      console.error("ElevenLabs API error:", response.status, await response.text());
      return NextResponse.json(
        { error: "Failed to generate speech" },
        { status: response.status }
      );
    }

    // Convert audio to base64
    const audioBuffer = await response.arrayBuffer();
    const base64Audio = Buffer.from(audioBuffer).toString("base64");

    return NextResponse.json({
      success: true,
      audio_data: base64Audio,
      content_type: "audio/mp3",
    });
  } catch (error) {
    console.error("Speech generation error:", error);

    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }

    return NextResponse.json(
      { error: "Failed to generate speech" },
      { status: 500 }
    );
  }
}
