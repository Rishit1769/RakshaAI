'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  poor_lighting: { label: 'Poor Lighting', emoji: '🌑' },
  other: { label: 'Other', emoji: '📋' },
};

const CATEGORIES = Object.keys(CATEGORY_LABELS) as Array<keyof typeof CATEGORY_LABELS>;

export default function CommunityPage() {
  const { isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  const { data, isLoading } = useQuery({
    queryKey: ['community-reports', selectedCategory],
    queryFn: () =>
      api.get(`/community${selectedCategory ? `?category=${selectedCategory}` : ''}`),
    refetchInterval: 30_000,
  });

  const upvoteMutation = useMutation({
    mutationFn: (reportId: string) => api.post('/community/upvote', { reportId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['community-reports'] }),
  });

  const reports = ((data as { data?: { reports?: Report[] } } | undefined)?.data?.reports) ?? [];

  return (
    <div className="min-h-screen bg-light">
      <header className="bg-white border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-muted hover:text-navy p-1 rounded hover:bg-gray-100">←</Link>
          <h1 className="text-base font-bold text-navy">Community Reports</h1>
        </div>
        {isAuthenticated && (
          <Link href="/community/report" className="btn-primary text-xs px-3 py-1.5">
            + Report
          </Link>
        )}
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Category filter */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => setSelectedCategory('')}
            className={`whitespace-nowrap text-xs px-3 py-1.5 rounded-full font-semibold shrink-0 ${
              !selectedCategory ? 'bg-primary text-white' : 'bg-white border border-border text-navy'
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
                className={`whitespace-nowrap text-xs px-3 py-1.5 rounded-full font-semibold shrink-0 ${
                  selectedCategory === cat ? 'bg-primary text-white' : 'bg-white border border-border text-navy'
                }`}
              >
                {emoji} {label}
              </button>
            );
          })}
        </div>

        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card h-24 animate-pulse bg-gray-100" />
            ))}
          </div>
        )}

        {!isLoading && reports.length === 0 && (
          <div className="card text-center py-10">
            <p className="text-3xl mb-2">📋</p>
            <p className="text-muted text-sm">No reports found</p>
            {isAuthenticated && (
              <Link href="/community/report" className="mt-3 inline-block text-primary text-sm font-semibold hover:underline">
                Be the first to report →
              </Link>
            )}
          </div>
        )}

        <div className="space-y-3">
          {reports.map((report) => {
            const cat = CATEGORY_LABELS[report.category];
            return (
              <div key={report.id} className="card space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{cat?.emoji ?? '📋'}</span>
                    <div>
                      <p className="text-sm font-semibold text-navy">
                        {report.title ?? cat?.label ?? report.category}
                      </p>
                      {(report.address ?? report.city) && (
                        <p className="text-xs text-muted">{[report.address, report.city].filter(Boolean).join(', ')}</p>
                      )}
                    </div>
                  </div>
                  {report.isVerified && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold">✓ Verified</span>
                  )}
                </div>

                {report.description && (
                  <p className="text-xs text-muted line-clamp-2">{report.description}</p>
                )}

                <div className="flex items-center justify-between pt-1">
                  <p className="text-xs text-muted">{new Date(report.createdAt).toLocaleDateString()}</p>
                  <button
                    onClick={() => isAuthenticated && upvoteMutation.mutate(report.id)}
                    disabled={!isAuthenticated || upvoteMutation.isPending}
                    className="flex items-center gap-1 text-xs text-muted hover:text-primary disabled:opacity-50 transition-colors"
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
