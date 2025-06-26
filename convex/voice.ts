"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";

// Text-to-Speech using ElevenLabs
export const textToSpeech = action({
  args: {
    text: v.string(),
    voiceId: v.optional(v.string()),
  },
  returns: v.string(), // Returns base64 audio data
  handler: async (ctx, args) => {
    if (!process.env.ELEVENLABS_API_KEY) {
      throw new Error("ELEVENLABS_API_KEY environment variable is not configured");
    }

    // Use default voice or specified voice ID
    const voiceId = args.voiceId || "IKne3meq5aSn9XLyUdCD"; // Your custom voice

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        Accept: "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": process.env.ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text: args.text,
        model_id: "eleven_monolingual_v1",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("ElevenLabs TTS Error:", response.status, response.statusText, errorText);
      throw new Error(`ElevenLabs TTS error: ${response.status} ${response.statusText}`);
    }

    const audioBuffer = await response.arrayBuffer();
    const base64Audio = Buffer.from(audioBuffer).toString("base64");

    return base64Audio;
  },
});

// Speech-to-Text using ElevenLabs (placeholder for future implementation)
// For now, we'll use browser's built-in Web Speech API on the frontend
export const speechToText = action({
  args: {
    audioData: v.string(), // base64 encoded audio
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    // This would implement ElevenLabs speech-to-text when available
    // For now, we'll use browser's Web Speech API
    throw new Error("Speech-to-text not yet implemented - using browser Web Speech API");
  },
});
