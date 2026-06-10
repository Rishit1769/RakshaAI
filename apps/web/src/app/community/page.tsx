'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { EmptyState, SkeletonCards } from '@/components/ui/LoadingState';
import { useAuthStore } from '@/store/auth.store';
import { api } from '@/lib/api/fetcher';

interface Report {
  id: string;
  category: string;
  title?: string;
  description?: string;
  address?: string;
  city?: string;
  upvoteCount: number;
  isVerified: boolean;
  createdAt: string;
}

const CATEGORY_LABELS: Record<string, { label: string; emoji: string }> = {
  unsafe_area: { label: 'Unsafe Area', emoji: '⚠️' },
  stalking: { label: 'Stalking', emoji: '👁️' },
  broken_streetlight: { label: 'Broken Streetlight', emoji: '💡' },
  suspicious_behavior: { label: 'Suspicious Behavior', emoji: '🔍' },
  unsafe_transport: { label: 'Unsafe Transport', emoji: '🚌' },
  harassment: { label: 'Harassment', emoji: '🚨' },
  poor_lighting: { label: 'Poor Lighting', emoji: '🌙' },
  other: { label: 'Other', emoji: '📋' },
};

const CATEGORIES = Object.keys(CATEGORY_LABELS) as Array<keyof typeof CATEGORY_LABELS>;

export default function CommunityPage() {
  const { isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  const { data, isLoading } = useQuery({
    queryKey: ['community-reports', selectedCategory],
    queryFn: () => api.get(`/community${selectedCategory ? `?category=${selectedCategory}` : ''}`),
    refetchInterval: 30_000,
  });

  const upvoteMutation = useMutation({
    mutationFn: (reportId: string) => api.post('/community/upvote', { reportId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['community-reports'] }),
  });

  const reports = ((data as { data?: { reports?: Report[] } } | undefined)?.data?.reports) ?? [];

  return (
    <div className="min-h-screen bg-light transition-colors duration-200 dark:bg-[#0B1026]">
      <header className="flex items-center justify-between border-b border-border bg-white px-4 py-3 dark:border-white/10 dark:bg-[#0d1628]">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="interactive rounded p-1 text-muted hover:bg-gray-100 hover:text-navy dark:hover:bg-white/5 dark:hover:text-white">
            ←
          </Link>
          <div>
            <h1 className="text-base font-bold text-navy dark:text-white">Community Reports</h1>
            <p className="text-xs text-muted">Local safety signals from verified users</p>
          </div>
        </div>
        {isAuthenticated ? (
          <Link href="/community/report" className="btn-primary px-3 py-1.5 text-xs">
            + Report
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
              const { label, emoji } = CATEGORY_LABELS[cat];
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(selectedCategory === cat ? '' : cat)}
                  className={`interactive shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ${
                    selectedCategory === cat ? 'bg-primary text-white' : 'border border-border bg-white text-navy hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10'
                  }`}
                >
                  {emoji} {label}
                </button>
              );
            })}
          </div>
        </div>

        {isLoading ? <SkeletonCards count={3} /> : null}

        {!isLoading && reports.length === 0 ? (
          <EmptyState
            icon="📋"
            title="No reports found"
            description="Try another category or start the first report for your area."
            action={
              isAuthenticated ? (
                <Link href="/community/report" className="interactive inline-block text-sm font-semibold text-primary hover:underline">
                  Be the first to report →
                </Link>
              ) : null
            }
          />
        ) : null}

        <div className="space-y-3">
          {reports.map((report) => {
            const cat = CATEGORY_LABELS[report.category];

            return (
              <div key={report.id} className="card space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 text-lg">{cat?.emoji ?? '📋'}</span>
                    <div>
                      <p className="text-sm font-semibold text-navy dark:text-white">
                        {report.title ?? cat?.label ?? report.category}
                      </p>
                      {(report.address ?? report.city) ? (
                        <p className="text-xs text-muted">{[report.address, report.city].filter(Boolean).join(', ')}</p>
                      ) : null}
                    </div>
                  </div>
                  {report.isVerified ? (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-500/15 dark:text-green-300">
                      Verified
                    </span>
                  ) : null}
                </div>

                {report.description ? <p className="text-sm text-muted">{report.description}</p> : null}

                <div className="flex items-center justify-between border-t border-navy/5 pt-3 dark:border-white/10">
                  <p className="text-xs text-muted">{new Date(report.createdAt).toLocaleDateString()}</p>
                  <button
                    onClick={() => isAuthenticated && upvoteMutation.mutate(report.id)}
                    disabled={!isAuthenticated || upvoteMutation.isPending}
                    className="interactive flex items-center gap-1 rounded-full px-2 py-1 text-xs text-muted hover:bg-primary/10 hover:text-primary disabled:opacity-50"
                    title={isAuthenticated ? 'Upvote' : 'Login to upvote'}
                  >
                    <span>👍</span>
                    <span className="font-semibold">{report.upvoteCount}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
