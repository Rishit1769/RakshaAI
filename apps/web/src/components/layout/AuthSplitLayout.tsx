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
      <section className="page-container grid gap-8 py-10 lg:grid-cols-[1.02fr_0.9fr] lg:py-16">
        <motion.div variants={stagger} initial="hidden" animate="visible">
          <Card padding="lg" className="hero-panel flex h-full flex-col justify-between overflow-hidden">
            <motion.div variants={fadeInUp}>
              <SectionBadge label={badge} pulse />
            </motion.div>
            <motion.div variants={fadeInUp} className="mt-8 space-y-4">
              <div className="display-section">{title}</div>
              <div className="max-w-xl text-lg leading-8 text-body">{description}</div>
            </motion.div>
            <motion.div variants={fadeInUp} className="mt-10 grid gap-4">
              {highlights.map((highlight, index) => (
                <div key={highlight} className="panel-subtle flex items-start gap-4 px-5 py-4 text-sm leading-7 text-body">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[image:var(--gradient-accent)] text-sm font-semibold text-white shadow-accent">
                    0{index + 1}
                  </span>
                  <p>{highlight}</p>
                </div>
              ))}
            </motion.div>
          </Card>
        </motion.div>

        <motion.div variants={fadeInUp} initial="hidden" animate="visible">
          <Card padding="lg" className="surface-panel-modern h-full">
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
