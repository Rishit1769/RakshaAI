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
      content: 'Hello. I am the RakshaAI Assistant. I am here to help with safety guidance, legal rights, and emotional support. How can I help you today?',
    },
  ]);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isAuthenticated) router.push('/auth/login');
  }, [isAuthenticated, router]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
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
    const apiMessages = newMessages.filter((_, i) => i > 0);
    chatMutation.mutate(apiMessages);
  }

  if (!isAuthenticated) return null;

  return (
    <div className="flex min-h-screen flex-col bg-light">
      <header className="flex items-center gap-3 border-b border-border bg-white px-4 py-3">
        <button onClick={() => router.back()} className="rounded p-1 text-muted hover:bg-gray-100 hover:text-navy">Back</button>
        <div>
          <p className="text-sm font-bold text-navy">RakshaAI Assistant</p>
          <p className="text-xs text-safe">Online</p>
        </div>
      </header>

      <div className="mx-auto flex-1 w-full max-w-2xl space-y-3 overflow-y-auto px-4 py-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-xs rounded-2xl px-4 py-2.5 text-sm leading-relaxed sm:max-w-sm ${
                msg.role === 'user'
                  ? 'rounded-br-sm bg-primary text-white'
                  : 'rounded-bl-sm border border-border bg-white text-navy shadow-sm'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {chatMutation.isPending ? (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-sm border border-border bg-white px-4 py-2.5 shadow-sm">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
            </div>
          </div>
        ) : null}
        <div ref={bottomRef} />
      </div>

      {messages.length <= 2 ? (
        <div className="mx-auto w-full max-w-2xl px-4 pb-2">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {QUICK_PROMPTS.map((p) => (
              <button
                key={p}
                onClick={() => send(p)}
                className="shrink-0 whitespace-nowrap rounded-full border border-border bg-white px-3 py-1.5 text-xs font-medium text-navy hover:bg-gray-50"
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mx-auto w-full max-w-2xl border-t border-border bg-white px-4 py-3">
        <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); } }}
            placeholder="Ask anything about safety..."
            rows={1}
            className="input-field flex-1 resize-none overflow-hidden"
          />
          <button type="submit" disabled={!input.trim() || chatMutation.isPending} className="btn-primary shrink-0 px-4 py-2 disabled:opacity-50">
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
