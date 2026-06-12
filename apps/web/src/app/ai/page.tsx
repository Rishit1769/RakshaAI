'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { api } from '@/lib/api/fetcher';

interface Message {
  role: 'user' | 'model';
  content: string;
}

const QUICK_PROMPTS = [
  'What should I do if I feel unsafe?',
  'How do I report harassment to police?',
  'What are my legal rights as a woman?',
  'Share safety tips for traveling alone at night',
];

export default function AiPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'model',
      content: 'Hello. I am the RakshaAI Support Assistant. I can help with safety guidance, legal rights, and emotional support. How can I help you today?',
    },
  ]);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isAuthenticated) router.push('/auth/login');
  }, [isAuthenticated, router]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  const chatMutation = useMutation({
    mutationFn: (msgs: Message[]) => api.post('/ai/chat', { messages: msgs }),
    onSuccess: (data) => {
      const reply = (data as { data?: { reply?: string } })?.data?.reply ?? 'Sorry, I could not generate a response.';
      setMessages((prev) => [...prev, { role: 'model', content: reply }]);
    },
    onError: () => {
      setMessages((prev) => [
        ...prev,
        { role: 'model', content: 'I am having trouble connecting right now. Please try again.' },
      ]);
    },
  });

  function send(text: string) {
    if (!text.trim() || chatMutation.isPending) return;
    const newMessages: Message[] = [...messages, { role: 'user', content: text.trim() }];
    setMessages(newMessages);
    setInput('');
    chatMutation.mutate(newMessages.filter((_, index) => index > 0));
  }

  if (!isAuthenticated) return null;

  return (
    <div className="flex min-h-screen flex-col bg-[#0A0F1E] text-white">
      <header className="flex items-center justify-between border-b border-white/10 bg-[#0F172A] px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="rounded-lg border border-white/10 px-3 py-1.5 text-sm font-medium text-slate-100 hover:bg-white/5"
          >
            Back
          </button>
          <div>
            <p className="text-sm font-bold text-white">Support Assistant</p>
            <p className="text-xs font-medium text-green-400">Online</p>
          </div>
        </div>
        <button
          onClick={() => router.push('/dashboard')}
          aria-label="Close assistant"
          className="rounded-lg border border-white/10 px-3 py-1.5 text-lg leading-none text-slate-200 hover:bg-white/5"
        >
          x
        </button>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-4">
        <div className="flex min-h-0 flex-1 flex-col rounded-[28px] border border-white/10 bg-[#111827] shadow-2xl">
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <div className="space-y-3">
              {messages.map((msg, index) => (
                <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                      msg.role === 'user'
                        ? 'rounded-br-sm bg-[#FF6B5E] text-white'
                        : 'rounded-bl-sm border border-white/10 bg-slate-50 text-slate-900'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}

              {chatMutation.isPending ? (
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-bl-sm border border-white/10 bg-slate-50 px-4 py-3 text-slate-900 shadow-sm">
                    Generating response...
                  </div>
                </div>
              ) : null}
              <div ref={bottomRef} />
            </div>
          </div>

          <div className="border-t border-white/10 px-4 py-3">
            {messages.length <= 2 ? (
              <div className="mb-3 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {QUICK_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => send(prompt)}
                    className="shrink-0 whitespace-nowrap rounded-full border border-white/15 bg-white/5 px-3 py-2 text-xs font-medium text-slate-100 hover:bg-white/10"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            ) : null}

            <form
              onSubmit={(event) => {
                event.preventDefault();
                send(input);
              }}
              className="flex items-end gap-2"
            >
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    send(input);
                  }
                }}
                placeholder="Ask anything about safety..."
                rows={1}
                className="min-h-12 flex-1 resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                type="submit"
                disabled={!input.trim() || chatMutation.isPending}
                className="inline-flex shrink-0 items-center justify-center rounded-2xl bg-[#FF6B5E] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-[#FF6B5E]/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Send
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
