import type { Metadata } from "next";
import "./globals.css";
import { TranscriptProvider } from "@/app/contexts/TranscriptContext";
import { EventProvider } from "@/app/contexts/EventContext";

export const metadata: Metadata = {
  title: "Kerala Government Certificate Helper",
  description:
    "A tool to help you apply for certificates from the Kerala government.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`antialiased`}>
        <TranscriptProvider>
          <EventProvider>{children}</EventProvider>
        </TranscriptProvider>
      </body>
    </html>
  );
}
