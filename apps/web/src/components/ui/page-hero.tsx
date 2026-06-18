'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/cn';
import { fadeInUp, stagger } from '@/lib/motion';
import { SectionBadge } from './section-badge';

interface PageHeroProps {
  badge?: string;
  title: ReactNode;
  description: ReactNode;
  actions?: ReactNode;
  aside?: ReactNode;
  align?: 'marketing' | 'product';
  className?: string;
}

export function PageHero({
  badge,
  title,
  description,
  actions,
  aside,
  align = 'marketing',
  className,
}: PageHeroProps) {
  return (
    <section className={cn('grid items-center gap-8 lg:gap-12', aside ? 'lg:grid-cols-[1.08fr_0.92fr]' : '', className)}>
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="visible"
        className={cn('space-y-6', align === 'marketing' ? 'max-w-3xl' : 'max-w-2xl')}
      >
        {badge ? (
          <motion.div variants={fadeInUp}>
            <SectionBadge label={badge} pulse />
          </motion.div>
        ) : null}
        <motion.div variants={fadeInUp} className="space-y-4">
          <div className={align === 'marketing' ? 'display-hero' : 'display-section'}>{title}</div>
          <div className="max-w-2xl text-base leading-8 text-body md:text-lg">{description}</div>
        </motion.div>
        {actions ? <motion.div variants={fadeInUp} className="flex flex-wrap gap-3">{actions}</motion.div> : null}
      </motion.div>
      {aside ? <div>{aside}</div> : null}
    </section>
  );
}
