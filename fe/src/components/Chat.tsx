import React, { useState, useRef, useEffect } from "react";
import { ChatMessage } from "@/interface/type";
import { IconSend, IconMessage } from "@/components/Icons";

interface ChatProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;

  // ✅ ký hiệu của mình để canh trái/phải
  mySymbol: "X" | "O" | null;
}

export const Chat: React.FC<ChatProps> = ({
  messages,
  onSendMessage,
  mySymbol,
}) => {
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = inputText.trim();
    if (t) {
      onSendMessage(t);
      setInputText("");
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/30 backdrop-blur-sm overflow-hidden">
      {/* Messages Area */}
      <div className="flex-grow overflow-y-auto p-3 space-y-3 custom-scrollbar">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-600 text-xs italic">
            <IconMessage className="w-8 h-8 mb-2 opacity-20" />
            <p>No messages yet.</p>
          </div>
        ) : (
          messages.map((msg: any) => {
            const isSystem = msg.sender === "System";
            if (isSystem) {
              return (
                <div key={msg.id} className="flex justify-center my-2">
                  <span className="text-[10px] uppercase tracking-wide text-slate-500 bg-slate-800/50 px-2 py-0.5 rounded-full border border-slate-700/50">
                    {msg.text}
                  </span>
                </div>
              );
            }

            const senderSymbol = (msg.sender ??
              msg.fromSymbol ??
              msg.symbol) as "X" | "O" | "System";

            const isMe =
              senderSymbol === "System"
                ? false
                : mySymbol
                ? senderSymbol === mySymbol
                : false;

            const isX = senderSymbol === "X";

            const ts =
              msg.timestamp instanceof Date
                ? msg.timestamp
                : new Date(msg.timestamp);

            return (
              <div
                key={msg.id}
                className={`flex flex-col max-w-[90%] ${
                  isMe ? "ml-auto items-end" : "mr-auto items-start"
                }`}
              >
                <div className="flex items-start gap-1.5 mb-1">
                  {/* Avatar */}
                  <div
                    className={`
      w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold shrink-0
      ${isX ? "bg-cyan-900 text-cyan-400" : "bg-rose-900 text-rose-400"}
    `}
                  >
                    {senderSymbol}
                  </div>

                  {/* Username (trên) + Time (dưới) */}
                  {!isMe && (
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-400 font-medium leading-tight">
                        {msg.username || "Unknown"}
                      </span>

                      <span className="text-[9px] text-slate-500 font-mono leading-tight">
                        {ts.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  )}

                  {/* Nếu là isMe → chỉ hiện time (bên phải bubble) */}
                  {isMe && (
                    <span className="text-[9px] text-slate-500 font-mono leading-tight ml-1">
                      {ts.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  )}
                </div>

                <div
                  className={`
                    px-3 py-2 rounded-lg text-sm break-words shadow-sm border
                    ${
                      isMe
                        ? "bg-slate-700/40 text-slate-200 border-slate-600 rounded-tr-none"
                        : "bg-slate-800/80 text-slate-200 border-slate-700 rounded-tl-none"
                    }
                  `}
                >
                  {msg.text}
                </div>
              </div>
            );
          })
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form
        onSubmit={handleSubmit}
        className="p-3 border-t border-slate-800 bg-slate-900/50"
      >
        <div className="relative">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type a message..."
            className="w-full bg-slate-950 border border-slate-700 text-sm rounded-lg pl-3 pr-10 py-2.5 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 text-slate-200 placeholder:text-slate-600 transition-all"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className={`
              absolute right-1.5 top-1.5 p-1.5 rounded-md transition-all
              ${
                !inputText.trim()
                  ? "text-slate-700 cursor-default"
                  : "bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-500/20"
              }
            `}
          >
            <IconSend className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};
