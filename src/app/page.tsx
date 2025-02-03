"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { dracula } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function Home() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "bot"; text: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    setMessages((prev) => [...prev, { role: "user", text: input }]);
    setInput("");
    setLoading(true);

    const response = await fetch("/api/hello", {
      method: "POST",
      body: JSON.stringify({ message: input }),
      headers: { "Content-Type": "application/json" },
    });

    const reader = response.body?.getReader();
    if (!reader) return;

    const decoder = new TextDecoder();
    let botReply = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });

      if (chunk.includes("[DONE]")) break; // Stop when done

      botReply += chunk;

      setMessages((prev) => [
        ...prev.filter((m) => m.role !== "bot"),
        { role: "bot", text: botReply },
      ]);
    }

    setLoading(false);
  };

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-gray-900 text-white px-4">
      {/* Chat Area */}
      <ScrollArea className="w-full max-w-2xl h-[500px] border border-gray-700 rounded-lg p-4 bg-gray-800 overflow-auto">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`mb-3 p-3 rounded-lg ${
              msg.role === "user" ? "bg-blue-600 text-white self-end" : "bg-gray-700 text-white"
            }`}
          >
            <ReactMarkdown
              components={{
                code({ node, inline, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || "");
                  return !inline && match ? (
                    <SyntaxHighlighter style={dracula} language={match[1]} PreTag="div" {...props}>
                      {String(children).replace(/\n$/, "")}
                    </SyntaxHighlighter>
                  ) : (
                    <code className="bg-gray-700 px-1 py-0.5 rounded" {...props}>
                      {children}
                    </code>
                  );
                },
              }}
            >
              {msg.text}
            </ReactMarkdown>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </ScrollArea>

      {/* Input Area */}
      <div className="w-full max-w-2xl flex gap-3 mt-4">
        <Textarea
          className="flex-1 bg-gray-800 text-white border-gray-700"
          placeholder="Type a message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <Button onClick={sendMessage} disabled={loading}>
          {loading ? "Thinking..." : "Send"}
        </Button>
      </div>
    </div>
  );
}