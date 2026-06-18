'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/card';
import { EmptyState, SkeletonCards } from '@/components/ui/LoadingState';
import { FilterPills } from '@/components/ui/filter-pills';
import { SectionBadge } from '@/components/ui/section-badge';
import { Textarea } from '@/components/ui/field';
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
    mutationFn: ({ reportId, content }: { reportId: string; content: string }) => api.post('/community/comments', { reportId, content }),
    onSuccess: (_, variables) => {
      setDraftComments((current) => ({ ...current, [variables.reportId]: '' }));
      queryClient.invalidateQueries({ queryKey: ['community-reports'] });
    },
  });

  const reports = ((data as { data?: { reports?: Report[] } } | undefined)?.data?.reports) ?? [];

  return (
    <AppShell
      title="Community Reports"
      subtitle="Local safety signals from verified users and nearby residents."
      backLabel="Dashboard"
      actions={isAuthenticated ? <Link href="/community/report" className="btn-primary">Report</Link> : null}
    >
      <div className="space-y-6">
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <SectionBadge label="Signal filters" />
              <p className="mt-3 text-sm text-muted">Browse patterns by incident category and add corroborating detail where it helps.</p>
            </div>
            <FilterPills
              options={[
                { label: 'All', value: '' },
                ...CATEGORIES.map((cat) => ({ label: CATEGORY_LABELS[cat].label, value: cat })),
              ]}
              selectedValue={selectedCategory}
              onChange={(value) => setSelectedCategory(value)}
            />
          </div>
        </Card>

        {isLoading ? <SkeletonCards count={3} /> : null}

        {!isLoading && reports.length === 0 ? (
          <EmptyState
            title="No reports found"
            description="Try another category or start the first report for your area."
            action={isAuthenticated ? <Link href="/community/report" className="btn-text-link">Be the first to report</Link> : null}
          />
        ) : null}

        <div className="space-y-4">
          {reports.map((report) => {
            const cat = CATEGORY_LABELS[report.category];
            const draft = draftComments[report.id] ?? '';

            return (
              <Card key={report.id} id={`report-${report.id}`} className="scroll-mt-24 space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xl font-semibold tracking-[-0.01em] text-ink">{report.title ?? cat?.label ?? report.category}</p>
                    {(report.address ?? report.city) ? <p className="mt-1 text-sm text-muted">{[report.address, report.city].filter(Boolean).join(', ')}</p> : null}
                  </div>
                  {report.isVerified ? <span className="badge-safe">Verified</span> : null}
                </div>

                {report.description ? <p className="text-sm leading-7 text-body">{report.description}</p> : null}

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className={report.pinColor === 'red' ? 'badge-emergency' : report.pinColor === 'yellow' ? 'badge-warning' : 'eyebrow'}>Pin {report.pinColor}</span>
                  <span className="eyebrow">Score {report.score}</span>
                  <span className="eyebrow">{report.upvoteCount} likes</span>
                  <span className="eyebrow">{report.commentCount} comments</span>
                </div>

                {report.comments.length > 0 ? (
                  <div className="rounded-[var(--radius-xl)] border border-border bg-surface-soft/72 p-4">
                    <div className="space-y-3">
                      {report.comments.map((comment) => (
                        <div key={comment.id}>
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">{comment.authorName}</p>
                          <p className="mt-1 text-sm text-body">{comment.content}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {isAuthenticated ? (
                  <div className="rounded-[var(--radius-xl)] border border-border bg-white/72 p-4">
                    <label className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Add comment</label>
                    <Textarea value={draft} onChange={(event) => setDraftComments((current) => ({ ...current, [report.id]: event.target.value }))} rows={2} className="mt-3 min-h-20 resize-none" placeholder="Add corroborating detail for this location..." />
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <button onClick={() => upvoteMutation.mutate(report.id)} disabled={upvoteMutation.isPending} className="btn-secondary">
                        Like report
                      </button>
                      <button onClick={() => commentMutation.mutate({ reportId: report.id, content: draft.trim() })} disabled={!draft.trim() || commentMutation.isPending} className="btn-primary">
                        Add comment
                      </button>
                    </div>
                  </div>
                ) : null}

                <div className="border-t border-hairline pt-4 text-xs text-muted">
                  {new Date(report.createdAt).toLocaleDateString()}
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
