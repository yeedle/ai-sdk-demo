import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { ChatInput, Message, Wrapper } from "./components.tsx";
import "./styles.css";

const App = () => {
  const [input, setInput] = useState("");
  const { messages, sendMessage } = useChat({
    transport: new DefaultChatTransport({
      api: "/chat",
    }),
  });

  return (
    <Wrapper>
      {messages.map((message) => (
        <Message key={message.id} role={message.role} parts={message.parts} />
      ))}
      <ChatInput
        input={input}
        onChange={(e) => setInput(e.currentTarget.value)}
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage({ text: input });
          setInput("");
        }}
      />
    </Wrapper>
  );
};

const root = createRoot(document.getElementById("root")!);
root.render(<App />);
