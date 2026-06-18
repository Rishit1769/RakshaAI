'use client';

import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import MarketingNav from '@/components/layout/MarketingNav';
import { Card } from '@/components/ui/card';
import { SectionBadge } from '@/components/ui/section-badge';
import { fadeInUp, stagger } from '@/lib/motion';

interface AuthSplitLayoutProps {
  badge: string;
  title: ReactNode;
  description: ReactNode;
  highlights: string[];
  formTitle: string;
  formDescription: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthSplitLayout({
  badge,
  title,
  description,
  highlights,
  formTitle,
  formDescription,
  children,
  footer,
}: AuthSplitLayoutProps) {
  return (
    <main className="min-h-screen bg-background">
      <MarketingNav />
      <section className="page-container grid gap-8 py-10 lg:grid-cols-[0.96fr_0.9fr] lg:py-16">
        <motion.div variants={stagger} initial="hidden" animate="visible">
          <Card padding="lg" className="accent-glow flex h-full flex-col justify-between overflow-hidden">
            <motion.div variants={fadeInUp}>
              <SectionBadge label={badge} pulse />
            </motion.div>
            <motion.div variants={fadeInUp} className="mt-8 space-y-4">
              <div className="display-section">{title}</div>
              <div className="max-w-xl text-lg leading-8 text-body">{description}</div>
            </motion.div>
            <motion.div variants={fadeInUp} className="mt-10 grid gap-4">
              {highlights.map((highlight) => (
                <div key={highlight} className="rounded-2xl border border-border bg-surface-soft/80 px-5 py-4 text-sm leading-7 text-body">
                  {highlight}
                </div>
              ))}
            </motion.div>
          </Card>
        </motion.div>

        <motion.div variants={fadeInUp} initial="hidden" animate="visible">
          <Card padding="lg" className="h-full">
            <div className="mb-8">
              <p className="font-mono text-xs uppercase tracking-[0.15em] text-primary">{formTitle}</p>
              <p className="mt-3 text-sm leading-7 text-muted">{formDescription}</p>
            </div>
            {children}
            {footer ? <div className="mt-6">{footer}</div> : null}
          </Card>
        </motion.div>
      </section>
    </main>
  );
}
