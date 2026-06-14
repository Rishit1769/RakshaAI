'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { AppShell } from '@/components/layout/AppShell';
import { useAuthStore } from '@/store/auth.store';
import { ApiError, api } from '@/lib/api/fetcher';

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
    onError: (error) => {
      let message = 'Something went wrong. Please try again.';

      if (error instanceof ApiError) {
        if (error.statusCode === 503) message = 'The AI assistant is temporarily unavailable. Please try again in a moment.';
        else if (error.statusCode === 401 || error.statusCode === 403) message = 'Authentication error. Please refresh the page and try again.';
        else message = error.message || message;
      } else if (error instanceof TypeError) {
        message = 'Unable to reach the server. Please check your connection.';
      }

      setMessages((prev) => [...prev, { role: 'model', content: message }]);
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
    <AppShell title="AI Support Assistant" subtitle="Safety guidance, emotional grounding, and escalation help." backLabel="Dashboard">
      <div className="grid gap-6 lg:grid-cols-[0.72fr_1.28fr]">
        <div className="surface-panel space-y-4 p-6">
          <span className="eyebrow">Suggested prompts</span>
          <h2 className="text-xl font-semibold text-ink">Start from a concrete situation.</h2>
          <div className="space-y-3">
            {QUICK_PROMPTS.map((prompt) => (
              <button key={prompt} onClick={() => send(prompt)} className="w-full rounded-xl border border-hairline bg-white px-4 py-3 text-left text-sm text-body hover:bg-surface-soft dark:bg-[#14171d]">
                {prompt}
              </button>
            ))}
          </div>
        </div>

        <div className="product-card flex min-h-[38rem] flex-col overflow-hidden p-0">
          <div className="border-b border-hairline px-5 py-4">
            <p className="text-sm font-semibold text-ink">Conversation</p>
            <p className="text-sm text-muted">Use the assistant for guidance, not as a replacement for emergency services.</p>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-5 py-5">
            {messages.map((msg, index) => (
              <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-7 ${msg.role === 'user' ? 'bg-primary text-white' : 'bg-surface-card text-body'}`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {chatMutation.isPending ? (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-surface-card px-4 py-3 text-sm text-body">Generating response...</div>
              </div>
            ) : null}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-hairline px-5 py-4">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                send(input);
              }}
              className="flex items-end gap-3"
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
                className="textarea-field min-h-12 flex-1 resize-none"
              />
              <button type="submit" disabled={!input.trim() || chatMutation.isPending} className="btn-primary">
                Send
              </button>
            </form>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
