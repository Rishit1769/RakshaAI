'use client';

import { useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { MessageCircle, Send, Sparkles, X } from 'lucide-react';
import { ApiError, api } from '@/lib/api/fetcher';

type ChatRole = 'user' | 'model';

interface ChatMessage {
  role: ChatRole;
  content: string;
}

const INITIAL_MESSAGE: ChatMessage = {
  role: 'model',
  content: 'Hello. I am your Raksha AI Assistant. I can help with safety guidance, emergency steps, and calm next actions.',
};

export function AIAssistantWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isOpen]);

  const chatMutation = useMutation({
    mutationFn: ({ history, message }: { history: ChatMessage[]; message: string }) =>
      api.post<{ reply: string }>('/ai/chat', { history, message }),
    onSuccess: (response) => {
      const reply = response.data?.reply ?? 'The assistant is currently unavailable.';
      setMessages((prev) => [...prev, { role: 'model', content: reply }]);
    },
    onError: (error) => {
      let fallback = 'The assistant is currently unavailable.';

      if (error instanceof ApiError) {
        if (error.statusCode === 401 || error.statusCode === 403) {
          fallback = 'Please sign in again to continue chatting.';
        } else {
          fallback = error.message || fallback;
        }
      }

      setMessages((prev) => [...prev, { role: 'model', content: fallback }]);
    },
  });

  function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || chatMutation.isPending) return;

    const nextUserMessage: ChatMessage = { role: 'user', content: trimmed };
    const nextMessages = [...messages, nextUserMessage];

    setMessages(nextMessages);
    setInput('');

    chatMutation.mutate({
      history: nextMessages.slice(1, -1),
      message: trimmed,
    });
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4">
      {isOpen ? (
        <div className="flex h-[500px] w-80 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl md:w-96 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0052ff] text-white shadow-lg">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="font-sans text-sm font-medium text-slate-900 dark:text-slate-100">Raksha AI Assistant</p>
                <p className="font-sans text-xs text-slate-500 dark:text-slate-400">Guidance, grounding, and next steps</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              aria-label="Close AI assistant"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-slate-50 px-4 py-4 dark:bg-slate-950/70">
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    message.role === 'user'
                      ? 'rounded-br-sm bg-[#0052ff] text-white'
                      : 'rounded-bl-sm bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100'
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}

            {chatMutation.isPending ? (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-sm bg-slate-100 px-4 py-3 text-sm text-slate-500 animate-pulse dark:bg-slate-800 dark:text-slate-300">
                  AI is typing...
                </div>
              </div>
            ) : null}
          </div>

          <div className="border-t border-slate-200 p-4 dark:border-slate-800">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                handleSend();
              }}
              className="flex items-end gap-3"
            >
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    handleSend();
                  }
                }}
                rows={1}
                placeholder="Ask Raksha AI..."
                className="min-h-12 flex-1 resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 font-sans text-sm text-slate-900 outline-none transition focus:border-[#0052ff] focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-blue-950"
              />
              <button
                type="submit"
                disabled={!input.trim() || chatMutation.isPending}
                className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#0052ff] text-white shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="Send message"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        className="inline-flex items-center justify-center rounded-full bg-[#0052ff] p-4 text-white shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl"
        aria-label={isOpen ? 'Hide AI assistant' : 'Open AI assistant'}
      >
        <MessageCircle className="h-6 w-6" />
      </button>
    </div>
  );
}
