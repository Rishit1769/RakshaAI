'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { EmptyState, SkeletonCards } from '@/components/ui/LoadingState';
import { useAuthStore } from '@/store/auth.store';
import { api } from '@/lib/api/fetcher';

interface ReportComment {
  id: string;
  content: string;
  createdAt: string;
  authorName: string;
}

interface Report {
  id: string;
  category: string;
  title?: string;
  description?: string;
  address?: string;
  city?: string;
  upvoteCount: number;
  score: number;
  pinColor: string;
  commentCount: number;
  comments: ReportComment[];
  isVerified: boolean;
  createdAt: string;
}

const CATEGORY_LABELS: Record<string, { label: string }> = {
  unsafe_area: { label: 'Unsafe Area' },
  stalking: { label: 'Stalking' },
  broken_streetlight: { label: 'Broken Streetlight' },
  suspicious_behavior: { label: 'Suspicious Behavior' },
  unsafe_transport: { label: 'Unsafe Transport' },
  harassment: { label: 'Harassment' },
  poor_lighting: { label: 'Poor Lighting' },
  other: { label: 'Other' },
};

const CATEGORIES = Object.keys(CATEGORY_LABELS) as Array<keyof typeof CATEGORY_LABELS>;

export default function CommunityPage() {
  const { isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [draftComments, setDraftComments] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['community-reports', selectedCategory],
    queryFn: () => api.get(`/community${selectedCategory ? `?category=${selectedCategory}` : ''}`),
    refetchInterval: 30_000,
  });

  const upvoteMutation = useMutation({
    mutationFn: (reportId: string) => api.post('/community/upvote', { reportId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['community-reports'] }),
  });

  const commentMutation = useMutation({
    mutationFn: ({ reportId, content }: { reportId: string; content: string }) =>
      api.post('/community/comments', { reportId, content }),
    onSuccess: (_, variables) => {
      setDraftComments((current) => ({ ...current, [variables.reportId]: '' }));
      queryClient.invalidateQueries({ queryKey: ['community-reports'] });
    },
  });

  const reports = ((data as { data?: { reports?: Report[] } } | undefined)?.data?.reports) ?? [];

  return (
    <div className="min-h-screen bg-light transition-colors duration-200 dark:bg-[#0B1026]">
      <header className="flex items-center justify-between border-b border-border bg-white px-4 py-3 dark:border-white/10 dark:bg-[#0d1628]">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="interactive rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-navy hover:bg-gray-50 dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:bg-white/10">
            Back
          </Link>
          <div>
            <h1 className="text-base font-bold text-navy dark:text-white">Community Reports</h1>
            <p className="text-xs text-muted">Local safety signals from verified users</p>
          </div>
        </div>
        {isAuthenticated ? (
          <Link href="/community/report" className="btn-primary px-3 py-1.5 text-xs">
            Report
          </Link>
        ) : null}
      </header>

      <main className="mx-auto max-w-3xl space-y-4 p-4 md:p-6">
        <div className="surface-panel p-3">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => setSelectedCategory('')}
              className={`interactive shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ${
                !selectedCategory ? 'bg-primary text-white' : 'border border-border bg-white text-navy hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10'
              }`}
            >
              All
            </button>
            {CATEGORIES.map((cat) => {
              const { label } = CATEGORY_LABELS[cat];
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(selectedCategory === cat ? '' : cat)}
                  className={`interactive shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ${
                    selectedCategory === cat ? 'bg-primary text-white' : 'border border-border bg-white text-navy hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {isLoading ? <SkeletonCards count={3} /> : null}

        {!isLoading && reports.length === 0 ? (
          <EmptyState
            title="No reports found"
            description="Try another category or start the first report for your area."
            action={
              isAuthenticated ? (
                <Link href="/community/report" className="interactive inline-block text-sm font-semibold text-primary hover:underline">
                  Be the first to report
                </Link>
              ) : null
            }
          />
        ) : null}

        <div className="space-y-3">
          {reports.map((report) => {
            const cat = CATEGORY_LABELS[report.category];
            const draft = draftComments[report.id] ?? '';

            return (
              <div key={report.id} id={`report-${report.id}`} className="card space-y-3 scroll-mt-24">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-navy dark:text-white">
                      {report.title ?? cat?.label ?? report.category}
                    </p>
                    {(report.address ?? report.city) ? (
                      <p className="text-xs text-muted">{[report.address, report.city].filter(Boolean).join(', ')}</p>
                    ) : null}
                  </div>
                  {report.isVerified ? (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-500/15 dark:text-green-300">
                      Verified
                    </span>
                  ) : null}
                </div>

                {report.description ? <p className="text-sm text-muted">{report.description}</p> : null}

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className={`rounded-full px-2 py-1 font-semibold ${
                    report.pinColor === 'red'
                      ? 'bg-emergency/10 text-emergency'
                      : report.pinColor === 'yellow'
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
                        : 'bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200'
                  }`}>
                    Pin {report.pinColor}
                  </span>
                  <span className="rounded-full bg-navy/5 px-2 py-1 text-navy dark:bg-white/10 dark:text-white">Score {report.score}</span>
                  <span className="rounded-full bg-navy/5 px-2 py-1 text-navy dark:bg-white/10 dark:text-white">{report.upvoteCount} likes</span>
                  <span className="rounded-full bg-navy/5 px-2 py-1 text-navy dark:bg-white/10 dark:text-white">{report.commentCount} comments</span>
                </div>

                {report.comments.length > 0 ? (
                  <div className="space-y-2 rounded-2xl border border-navy/10 bg-navy/5 p-3 dark:border-white/10 dark:bg-white/5">
                    {report.comments.map((comment) => (
                      <div key={comment.id}>
                        <p className="text-xs font-semibold text-navy dark:text-white">{comment.authorName}</p>
                        <p className="text-sm text-muted">{comment.content}</p>
                      </div>
                    ))}
                  </div>
                ) : null}

                {isAuthenticated ? (
                  <div className="space-y-2 rounded-2xl border border-navy/10 bg-white/70 p-3 dark:border-white/10 dark:bg-white/5">
                    <label className="text-xs font-semibold uppercase tracking-wide text-muted">Add Comment</label>
                    <textarea
                      value={draft}
                      onChange={(event) => setDraftComments((current) => ({ ...current, [report.id]: event.target.value }))}
                      rows={2}
                      className="input-field min-h-20 resize-none"
                      placeholder="Add corroborating detail for this location..."
                    />
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => upvoteMutation.mutate(report.id)}
                        disabled={upvoteMutation.isPending}
                        className="rounded-full border border-primary/20 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10 disabled:opacity-50"
                      >
                        Like Report
                      </button>
                      <button
                        onClick={() => commentMutation.mutate({ reportId: report.id, content: draft.trim() })}
                        disabled={!draft.trim() || commentMutation.isPending}
                        className="btn-primary px-3 py-1.5 text-xs disabled:opacity-50"
                      >
                        Add Comment
                      </button>
                    </div>
                  </div>
                ) : null}

                <div className="flex items-center justify-between border-t border-navy/5 pt-3 text-xs text-muted dark:border-white/10">
                  <p>{new Date(report.createdAt).toLocaleDateString()}</p>
                  {!isAuthenticated ? <p>Log in to like or comment</p> : null}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
