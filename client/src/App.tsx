import { useState, useRef, useEffect } from 'react';
import './index.css';

interface Message {
  id: number;
  text: string;
  isUser: boolean;
}

const suggestedPrompts = [
  "Summarize this YouTube video",
  "What are the key points from this video?", 
  "Explain the concepts in this video"
];

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [threadId] = useState(() => Date.now().toString());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    autoResizeTextarea();
  }, [inputText]);

  const autoResizeTextarea = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const newHeight = Math.min(textarea.scrollHeight, 150);
      textarea.style.height = `${newHeight}px`;
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const extractVideoId = (text: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
      /^[a-zA-Z0-9_-]{11}$/,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return null;
  };

  const sendMessage = async () => {
    if (inputText.trim() === "" || isLoading) return;

    const userMessage = {
      id: Date.now(),
      text: inputText.trim(),
      isUser: true,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setIsLoading(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
      const videoId = extractVideoId(userMessage.text);

      const response = await fetch(`${apiUrl}/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: userMessage.text,
          thread_id: threadId,
          video_id: videoId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Request failed" }));
        throw new Error(errorData.error || "Failed to get response");
      }

      const data = await response.json();

      const aiMessage = {
        id: Date.now(),
        text: data.response,
        isUser: false,
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error("Error:", error);

      const errorMessage = {
        id: Date.now(),
        text:
          error instanceof Error
            ? error.message
            : "Sorry, there was an error processing your request.",
        isUser: false,
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestedPrompt = (prompt: string) => {
    setInputText(prompt);
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <a
          href="https://www.youtube.com"
          target="_blank"
          rel="noopener noreferrer"
          className="upgrade-btn"
        >
          YouTube
        </a>
      </header>

      <main className="main-content">
        {messages.length === 0 ? (
          <div className="welcome-section">
            <h1 className="welcome-title">
              Good to See You! How Can I Help with YouTube?
            </h1>
            <p className="welcome-subtitle">
              Share any YouTube video and I'll analyze it for you. Ask questions
              about content, get summaries, or explore topics.
            </p>

            <div className="suggested-prompts">
              {suggestedPrompts.map((prompt, index) => (
                <button
                  key={index}
                  className="prompt-btn"
                  onClick={() => handleSuggestedPrompt(prompt)}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="messages-container">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`message ${
                  message.isUser ? "user-message" : "ai-message"
                }`}
              >
                <div className="message-content">{message.text}</div>
              </div>
            ))}
            {isLoading && (
              <div className="message ai-message">
                <div className="message-content loading">
                  <span className="dot"></span>
                  <span className="dot"></span>
                  <span className="dot"></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </main>

      <div className="input-section">
        <div className="input-container">
          <button className="input-icon-btn plus-btn">
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M10 5V15M5 10H15"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything..."
            disabled={isLoading}
            rows={1}
            className="message-input"
          />

          <button
            className="input-icon-btn send-btn"
            onClick={sendMessage}
            disabled={inputText.trim() === "" || isLoading}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M10 5L10 15M15 10L10 5L5 10"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
