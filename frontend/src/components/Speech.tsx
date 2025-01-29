"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";

export default function NewsletterCard() {
  const [text, setText] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle newsletter subscription here
    console.log("Subscribed with:", text);
    setText("");
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-center text-2xl">
          Text to speech example
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit}
          className="flex flex-col sm:flex-row gap-4"
        >
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
      </CardContent>
    </Card>
  );
}
