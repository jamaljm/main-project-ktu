"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";

export default function NewsletterCard() {
  const [text, setText] = useState("");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [lastSpokenText, setLastSpokenText] = useState<string | null>(null); // Track last spoken text

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch("http://localhost:5000/api/say", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch speech audio");
      }

      // Convert response into a blob
      const audioBlob = await response.blob();
      const audioObjectUrl = URL.createObjectURL(audioBlob);

      // Reset the audio URL to force reload
      setAudioUrl(null);  // Set to null first to trigger re-render
      setTimeout(() => {
        setAudioUrl(audioObjectUrl);  // Then set the new URL after a brief delay
      }, 100);

      setLastSpokenText(text); // Store the spoken text for replay

      // Play the audio automatically
      const audio = new Audio(audioObjectUrl);
      audio.play();

      setText(""); // Clear the input field
    } catch (error) {
      console.error("Error sending text:", error);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-center text-2xl">
          Text to Speech Example
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4">
          <Input
            type="text"
            placeholder="Enter your text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="flex-grow"
            required
          />
          <Button type="submit" className="bg-green-700 hover:bg-green-800">
            Say
          </Button>
        </form>


        {audioUrl && (
          <audio controls className="mt-4 w-full">
            <source src={audioUrl} type="audio/mpeg" />
            Your browser does not support the audio element.
          </audio>
        )}
      </CardContent>
    </Card>
  );
}
