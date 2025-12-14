import React, { useState, useRef, useEffect } from 'react';
import { Player, ChatMessage } from '@/interface/type';
import { IconSend, IconMessage } from '@/components/Icons';

interface ChatProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  currentPlayer: Player;
}

export const Chat: React.FC<ChatProps> = ({ messages, onSendMessage, currentPlayer }) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim()) {
      onSendMessage(inputText.trim());
      setInputText('');
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
          messages.map((msg) => {
            const isMe = msg.sender === currentPlayer;
            const isSystem = msg.sender === 'System';
            
            if (isSystem) {
                return (
                    <div key={msg.id} className="flex justify-center my-2">
                        <span className="text-[10px] uppercase tracking-wide text-slate-500 bg-slate-800/50 px-2 py-0.5 rounded-full border border-slate-700/50">
                            {msg.text}
                        </span>
                    </div>
                )
            }

            const isX = msg.sender === 'X';

            return (
              <div 
                key={msg.id} 
                className={`flex flex-col max-w-[90%] ${isX ? 'mr-auto items-start' : 'ml-auto items-end'}`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  {/* Tiny Avatar */}
                  <div className={`
                    w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold
                    ${isX ? 'bg-cyan-900 text-cyan-400' : 'bg-rose-900 text-rose-400'}
                  `}>
                    {msg.sender}
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div 
                  className={`
                    px-3 py-2 rounded-lg text-sm break-words shadow-sm border
                    ${isX 
                      ? 'bg-slate-800/80 text-slate-200 border-slate-700 rounded-tl-none' 
                      : 'bg-slate-700/40 text-slate-200 border-slate-600 rounded-tr-none'
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
      <form onSubmit={handleSubmit} className="p-3 border-t border-slate-800 bg-slate-900/50">
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
              ${!inputText.trim() 
                ? 'text-slate-700 cursor-default' 
                : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-500/20'
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
