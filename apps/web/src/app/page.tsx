import Link from 'next/link';
import MarketingFooter from '@/components/layout/MarketingFooter';
import MarketingNav from '@/components/layout/MarketingNav';

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

export default function HomePage() {
  return (
    <main className="bg-background">
      <MarketingNav />

      <section className="border-b border-[var(--border)] bg-[var(--bg-page)]">
        <div className="page-container grid grid-cols-1 items-center gap-12 py-20 md:grid-cols-2">
          <div className="space-y-8">
            <span className="eyebrow">Built for real emergency coordination</span>
            <div className="space-y-5">
              <h1 className="display-hero">Safety infrastructure that reacts fast, stays calm, and keeps everyone aligned.</h1>
              <p className="max-w-2xl text-base leading-relaxed text-[var(--text-secondary)]">
                RakshaAI combines emergency SOS, live responder workflows, safety mapping, community intelligence, and AI-guided support into one coordinated surface.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href="/auth/register" className="btn-primary">
                Create account
              </Link>
              <Link href="/auth/login" className="btn-secondary">
                Sign in
              </Link>
            </div>

            <div className="flex flex-wrap gap-3">
              {trustBadges.map((badge) => (
                <span key={badge} className="eyebrow">
                  {badge}
                </span>
              ))}
            </div>
          </div>

          <div className="w-full max-w-[560px] overflow-hidden rounded-[16px] border border-[var(--border)] bg-[var(--bg-card)] p-8 shadow-[var(--shadow-md)] md:ml-auto">
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">Live safety console</p>
                <p className="text-sm text-[var(--text-muted)]">Shared view across alert, location, and response.</p>
              </div>
              <span className="badge-safe">System online</span>
            </div>

            <div className="grid grid-cols-1 items-start gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
              <div className="min-w-0 flex flex-col gap-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">Emergency trigger</p>
                <div className="flex items-center justify-center rounded-[12px] border border-[var(--border)] bg-[var(--surface-muted)] py-6">
                  <div className="flex h-32 w-32 items-center justify-center rounded-full bg-[var(--color-emergency)] text-xl font-bold text-[var(--color-on-emergency)]">SOS</div>
                </div>
                <div className="space-y-3">
                  <div className="flex min-w-0 w-full items-center justify-between gap-3 rounded-[8px] border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--text-secondary)]">
                    <span className="min-w-0">Location</span>
                    <span className="min-w-0 text-right font-medium text-[var(--text-primary)]">Live GPS</span>
                  </div>
                  <div className="flex min-w-0 w-full items-center justify-between gap-3 rounded-[8px] border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--text-secondary)]">
                    <span className="min-w-0">Status</span>
                    <span className="min-w-0 text-right font-medium text-[var(--text-primary)]">Contacts notified</span>
                  </div>
                </div>
              </div>

              <div className="min-w-0 overflow-hidden rounded-[12px] border border-[var(--border)] bg-[var(--bg-card)] p-4">
                <div className="nav-pill-group w-fit justify-start">
                  <span className="nav-pill-active">Safe Zones</span>
                  <span className="nav-pill">Volunteers</span>
                  <span className="nav-pill">Police</span>
                </div>

                <div className="mt-4 overflow-hidden rounded-[12px] bg-[var(--surface-muted)] p-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="min-w-0 overflow-hidden rounded-[10px] border border-[var(--border)] bg-[var(--bg-page)] p-4">
                      <p className="text-xs text-[var(--text-muted)]">Area risk</p>
                      <p className="mt-3 min-w-0 text-lg font-semibold leading-tight text-[var(--text-primary)]">Moderate</p>
                    </div>
                    <div className="min-w-0 overflow-hidden rounded-[10px] border border-[var(--border)] bg-[var(--bg-page)] p-4">
                      <p className="text-xs text-[var(--text-muted)]">Safe zones</p>
                      <p className="mt-3 min-w-0 text-lg font-semibold leading-tight text-[var(--text-primary)]">6 nearby</p>
                    </div>
                    <div className="min-w-0 overflow-hidden rounded-[10px] border border-[var(--border)] bg-[var(--bg-page)] p-4">
                      <p className="text-xs text-[var(--text-muted)]">Responders</p>
                      <p className="mt-3 min-w-0 text-lg font-semibold leading-tight text-[var(--text-primary)]">14 active</p>
                    </div>
                  </div>

                  <div className="mt-4 overflow-hidden rounded-[12px] border border-[var(--border)] bg-[var(--bg-page)] p-4">
                    <div className="grid grid-cols-5 gap-2">
                      {Array.from({ length: 15 }).map((_, index) => (
                        <div
                          key={index}
                          className={`h-6 rounded-[8px] border border-[var(--border)] ${
                            index === 4 || index === 9 ? 'bg-[var(--surface-muted)]' : 'bg-[var(--bg-card)]'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="product" className="py-20">
        <div className="page-container space-y-12">
          <div className="max-w-3xl space-y-4">
            <span className="eyebrow">Purpose-built product surface</span>
            <h2 className="display-section">Every critical action has one clear next step.</h2>
            <p className="text-base leading-relaxed text-[var(--text-secondary)]">
              The platform is designed to reduce confusion during stressful moments: trigger, confirm, route, monitor, and resolve.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {workflowCards.map((card) => (
              <article key={card.title} className="feature-card">
                <div className="mb-6 h-10 w-10 rounded-full bg-[var(--surface-muted)]" />
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">{card.title}</h3>
                <p className="mt-3 text-base leading-relaxed text-[var(--text-secondary)]">{card.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="solutions" className="border-y border-[var(--border)] bg-[var(--surface-muted)] py-20">
        <div className="page-container grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-4">
            <span className="eyebrow">Real product fragments</span>
            <h2 className="display-section">Show the actual workflows, not generic safety illustrations.</h2>
            <p className="text-base leading-relaxed text-[var(--text-secondary)]">
              The marketing surface borrows from the same flows users and responders actually rely on: map layers, alert cards, conversation support, and routing context.
            </p>
          </div>

          <div className="grid items-stretch gap-6 lg:grid-cols-3">
            {featureRows.map((row) => (
              <article key={row.title} className="flex h-full flex-col overflow-hidden rounded-[16px] border border-[var(--border)] bg-[var(--bg-card)] shadow-[var(--shadow-md)]">
                <div className="h-40 overflow-hidden bg-[var(--surface-muted)] p-4">
                  <div className="flex h-full flex-col overflow-hidden rounded-[12px] border border-[var(--border)] bg-[var(--bg-card)] p-4">
                    <div className="nav-pill-group w-fit justify-start">
                      <span className="nav-pill-active">Overview</span>
                      <span className="nav-pill">Signals</span>
                    </div>
                    <div className="mt-4 grid flex-1 auto-rows-fr grid-cols-2 gap-3 overflow-hidden">
                      <div className="overflow-hidden rounded-[10px] bg-[var(--surface-muted)] p-3 text-sm text-[var(--text-muted)]">Signal density</div>
                      <div className="overflow-hidden rounded-[10px] bg-[var(--surface-muted)] p-3 text-sm text-[var(--text-muted)]">Coverage</div>
                      <div className="overflow-hidden rounded-[10px] bg-[var(--surface-muted)] p-3 text-sm text-[var(--text-muted)]">Nearby support</div>
                      <div className="overflow-hidden rounded-[10px] bg-[var(--surface-muted)] p-3 text-sm text-[var(--text-muted)]">Escalation path</div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-1 flex-col justify-between p-6">
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--text-primary)]">{row.title}</h3>
                    <p className="mt-2 text-sm text-[var(--text-secondary)]">{row.copy}</p>
                  </div>
                  <Link href={row.href} className="pt-4 text-sm font-semibold text-[var(--text-primary)]">
                    Explore surface
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="page-container">
          <div className="cta-band text-center">
            <h2 className="display-subsection">Smarter coordination starts before the emergency peaks.</h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-[var(--text-secondary)]">
              Create an account, set up your safety profile, and move between awareness, prevention, and response inside one consistent system.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/auth/register" className="btn-primary">
                Create account
              </Link>
              <Link href="/dashboard" className="btn-secondary">
                View dashboard
              </Link>
            </div>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </main>
  );
}
