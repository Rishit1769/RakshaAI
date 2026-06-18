'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import MarketingFooter from '@/components/layout/MarketingFooter';
import MarketingNav from '@/components/layout/MarketingNav';
import { Card } from '@/components/ui/card';
import { PageHero } from '@/components/ui/page-hero';
import { SectionHeader } from '@/components/ui/section-header';
import { fadeInUp, stagger } from '@/lib/motion';

const trustBadges = ['Emergency-ready workflows', 'Community intelligence', 'Live responder coordination'];

const workflowCards = [
  {
    title: 'Immediate SOS activation',
    body: 'Trigger alerts in seconds, attach live location when available, and keep confirmation fast even if secondary systems are degraded.',
  },
  {
    title: 'Responder network routing',
    body: 'Nearby volunteers, police operators, and trusted contacts see the same incident context with clearer status handoff.',
  },
  {
    title: 'Preventive intelligence',
    body: 'Community reports, map overlays, and AI-assisted guidance help users avoid unsafe situations before they escalate.',
  },
];

const featureRows = [
  {
    title: 'Safety map with live layers',
    copy: 'Switch between safe zones, volunteer coverage, and police visibility without leaving the same surface.',
    href: '/map',
  },
  {
    title: 'AI support when panic reduces clarity',
    copy: 'Offer rapid guidance, escalation tips, and next-step prompts inside a calmer support interface.',
    href: '/ai',
  },
  {
    title: 'Journey monitoring for everyday movement',
    copy: 'Turn routine travel into an actively monitored session that can escalate instantly if plans change.',
    href: '/journey',
  },
] as const;

function HeroConsole() {
  return (
    <div className="relative hidden lg:block">
      <div className="motion-safe-spin-slow absolute inset-x-10 top-10 aspect-square rounded-full border border-dashed border-primary/20" />
      <Card padding="lg" className="relative overflow-hidden shadow-panel">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
        <div className="grid gap-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.16em] text-primary">Live safety console</p>
              <p className="mt-2 text-sm text-muted">Shared view across alert, location, and response.</p>
            </div>
            <span className="badge-safe">System online</span>
          </div>

          <div className="motion-safe-float rounded-[1.75rem] border border-border bg-surface-soft/85 p-6">
            <div className="flex items-center justify-center rounded-full bg-[image:var(--gradient-accent)] px-6 py-16 text-3xl font-semibold tracking-[0.12em] text-white shadow-accent-lg">
              SOS
            </div>
          </div>

          <div className="grid gap-3">
            {[
              ['Location', 'Live GPS'],
              ['Status', 'Contacts + responders notified'],
              ['Context', 'Community + AI guidance available'],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between rounded-2xl border border-border bg-white/80 px-4 py-3 text-sm">
                <span className="text-muted">{label}</span>
                <span className="font-medium text-ink">{value}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-3">
            {['Map', 'Signals', 'Responders'].map((item, index) => (
              <div key={item} className={`rounded-2xl p-4 text-center text-sm ${index === 0 ? 'bg-surface-inverted text-white' : 'bg-surface-soft/80 text-ink'}`}>
                {item}
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}

export default function HomePage() {
  return (
    <main className="bg-background">
      <MarketingNav />

      <section className="border-b border-border py-14 md:py-20">
        <div className="page-container">
          <PageHero
            badge="Built for real emergency coordination"
            title={
              <>
                Safety infrastructure that reacts fast, stays calm, and keeps everyone <span className="gradient-text">aligned</span>.
              </>
            }
            description="RakshaAI combines emergency SOS, live responder workflows, safety mapping, community intelligence, and AI-guided support into one coordinated surface."
            actions={
              <>
                <Link href="/auth/register" className="btn-primary">
                  Create account
                </Link>
                <Link href="/auth/login" className="btn-secondary">
                  Sign in
                </Link>
              </>
            }
            aside={<HeroConsole />}
          />

          <div className="mt-8 flex flex-wrap gap-3">
            {trustBadges.map((badge) => (
              <span key={badge} className="eyebrow">
                <span className="h-2 w-2 rounded-full bg-primary" />
                {badge}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section id="product" className="py-20 md:py-28">
        <div className="page-container space-y-12">
          <SectionHeader
            badge="Purpose-built product surface"
            title={
              <>
                Every critical action has <span className="gradient-text">one clear next step</span>.
              </>
            }
            description="The platform is designed to reduce confusion during stressful moments: trigger, confirm, route, monitor, and resolve."
          />

          <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.15, margin: '-60px' }} className="grid gap-6 md:grid-cols-3">
            {workflowCards.map((card, index) => (
              <motion.article key={card.title} variants={fadeInUp}>
                <Card variant={index === 1 ? 'featured' : 'default'} padding="lg" className="h-full">
                  <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[image:var(--gradient-accent)] text-base font-semibold text-white shadow-accent">
                    0{index + 1}
                  </div>
                  <h3 className="text-xl font-semibold tracking-[-0.01em] text-ink">{card.title}</h3>
                  <p className="mt-3 text-base leading-8 text-body">{card.body}</p>
                </Card>
              </motion.article>
            ))}
          </motion.div>
        </div>
      </section>

      <section id="solutions" className="inverted-section py-20 md:py-28">
        <div className="page-container space-y-12">
          <SectionHeader
            badge="Real product fragments"
            title="Show the actual workflows, not generic safety illustrations."
            description="The marketing surface borrows from the same flows users and responders actually rely on: map layers, alert cards, conversation support, and routing context."
          />

          <div className="grid gap-6 lg:grid-cols-3">
            {featureRows.map((row, index) => (
              <Card key={row.title} variant={index === 1 ? 'featured' : 'inverted'} padding="none" className="overflow-hidden">
                <div className="relative h-44 overflow-hidden border-b border-white/10 p-5">
                  <div className="dot-grid absolute inset-0 opacity-20" />
                  <div className="relative flex h-full items-center justify-center rounded-[1.75rem] border border-white/10 bg-white/5">
                    <div className="grid gap-3 text-center">
                      <span className="font-mono text-xs uppercase tracking-[0.18em] text-white/70">Overview</span>
                      <span className="font-mono text-xs uppercase tracking-[0.18em] text-white/70">Signals</span>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-white">{row.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-white/72">{row.copy}</p>
                  <Link href={row.href} className="mt-5 inline-flex text-sm font-semibold text-white">
                    Explore surface
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 md:py-28">
        <div className="page-container">
          <Card padding="lg" className="accent-glow text-center">
            <div className="mx-auto max-w-3xl">
              <p className="font-mono text-xs uppercase tracking-[0.16em] text-primary">Get started</p>
              <h2 className="display-subsection mt-4">Smarter coordination starts before the emergency peaks.</h2>
              <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-body">
                Create an account, set up your safety profile, and move between awareness, prevention, and response inside one consistent system.
              </p>
            </div>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/auth/register" className="btn-primary">
                Create account
              </Link>
              <Link href="/dashboard" className="btn-secondary">
                View dashboard
              </Link>
            </div>
          </Card>
        </div>
      </section>

      <MarketingFooter />
    </main>
  );
}
