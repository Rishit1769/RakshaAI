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

      <section className="border-b border-hairline bg-canvas">
        <div className="page-container grid gap-10 py-20 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
          <div className="animate-fade-in space-y-8">
            <span className="eyebrow">Built for real emergency coordination</span>
            <div className="space-y-5">
              <h1 className="display-hero">
                Safety infrastructure that reacts fast, stays calm, and keeps everyone aligned.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-body">
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
                <span key={badge} className="eyebrow bg-canvas border border-hairline">
                  {badge}
                </span>
              ))}
            </div>
          </div>

          <div className="animate-slide-up product-card space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-ink">Live safety console</p>
                <p className="text-sm text-muted">Shared view across alert, location, and response.</p>
              </div>
              <span className="badge-safe">System online</span>
            </div>

            <div className="grid gap-4 md:grid-cols-[0.92fr_1.08fr]">
              <div className="rounded-xl bg-surface-card p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Emergency trigger</p>
                <div className="mt-4 flex items-center justify-center py-6">
                  <div className="btn-sos h-28 w-28 text-xl md:h-32 md:w-32">SOS</div>
                </div>
                <div className="space-y-2 text-sm text-body">
                  <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2">
                    <span>Location</span>
                    <span className="font-medium text-ink">Live GPS</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2">
                    <span>Status</span>
                    <span className="font-medium text-ink">Contacts notified</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-hairline p-4">
                <div className="nav-pill-group">
                  <span className="nav-pill-active">Safe Zones</span>
                  <span className="nav-pill">Volunteers</span>
                  <span className="nav-pill">Police</span>
                </div>
                <div className="mt-4 rounded-xl bg-surface-card p-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-lg bg-white p-3">
                      <p className="text-xs text-muted">Area risk</p>
                      <p className="mt-3 text-lg font-semibold text-ink">Moderate</p>
                    </div>
                    <div className="rounded-lg bg-white p-3">
                      <p className="text-xs text-muted">Safe zones</p>
                      <p className="mt-3 text-lg font-semibold text-ink">6 nearby</p>
                    </div>
                    <div className="rounded-lg bg-white p-3">
                      <p className="text-xs text-muted">Responders</p>
                      <p className="mt-3 text-lg font-semibold text-ink">14 active</p>
                    </div>
                  </div>
                  <div className="mt-4 h-44 rounded-xl bg-[linear-gradient(135deg,#ffffff_0%,#f4f4f5_100%)] p-4">
                    <div className="grid h-full grid-cols-5 gap-2">
                      {Array.from({ length: 15 }).map((_, index) => (
                        <div
                          key={index}
                          className={`rounded-lg ${
                            index === 4 || index === 9 ? 'bg-primary/10 border border-primary/10' : 'bg-white border border-hairline'
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

      <section id="product" className="py-24">
        <div className="page-container space-y-12">
          <div className="max-w-3xl space-y-4">
            <span className="eyebrow">Purpose-built product surface</span>
            <h2 className="display-section">Every critical action has one clear next step.</h2>
            <p className="text-lg leading-8 text-body">
              The platform is designed to reduce confusion during stressful moments: trigger, confirm, route, monitor, and resolve.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {workflowCards.map((card) => (
              <article key={card.title} className="feature-card">
                <div className="mb-6 h-10 w-10 rounded-full bg-white" />
                <h3 className="text-xl font-semibold text-ink">{card.title}</h3>
                <p className="mt-3 text-base leading-7 text-body">{card.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="solutions" className="border-y border-hairline bg-surface-soft py-24">
        <div className="page-container grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-4">
            <span className="eyebrow">Real product fragments</span>
            <h2 className="display-section">Show the actual workflows, not generic safety illustrations.</h2>
            <p className="text-lg leading-8 text-body">
              The marketing surface borrows from the same flows users and responders actually rely on: map layers, alert cards, conversation support, and routing context.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <article className="product-card">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-ink">Responder feed</p>
                <span className="eyebrow bg-badge-emerald/20">Live</span>
              </div>
              <div className="mt-4 space-y-3">
                <div className="rounded-xl bg-surface-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-muted">RAK-2191</p>
                      <p className="text-sm font-semibold text-ink">Harassment alert</p>
                      <p className="text-xs text-muted">Andheri West, Mumbai</p>
                    </div>
                    <span className="badge-emergency">Critical</span>
                  </div>
                </div>
                <div className="rounded-xl border border-hairline p-4">
                  <p className="text-xs text-muted">Volunteer accepted</p>
                  <p className="mt-2 text-sm font-semibold text-ink">ETA 4 min</p>
                </div>
              </div>
            </article>

            <article className="product-card">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-ink">AI guidance</p>
                <span className="eyebrow bg-badge-violet/20">Support</span>
              </div>
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl bg-surface-card px-4 py-3 text-sm text-body">
                  Share your location with a trusted contact and move toward the nearest lit public place.
                </div>
                <div className="rounded-2xl border border-hairline px-4 py-3 text-sm text-ink">
                  What should I do if I feel unsafe while travelling alone?
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section id="resources" className="py-24">
        <div className="page-container space-y-10">
          <div className="max-w-3xl space-y-4">
            <span className="eyebrow">Beyond emergency response</span>
            <h2 className="display-section">The same system supports prevention, planning, and local awareness.</h2>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {featureRows.map((row) => (
              <article key={row.title} className="product-card flex flex-col justify-between">
                <div>
                  <div className="mb-6 h-40 rounded-xl bg-surface-card p-4">
                    <div className="h-full rounded-xl border border-hairline bg-white p-4">
                      <div className="nav-pill-group">
                        <span className="nav-pill-active">Overview</span>
                        <span className="nav-pill">Signals</span>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <div className="rounded-lg bg-surface-card p-3 text-sm text-muted">Signal density</div>
                        <div className="rounded-lg bg-surface-card p-3 text-sm text-muted">Coverage</div>
                        <div className="rounded-lg bg-surface-card p-3 text-sm text-muted">Nearby support</div>
                        <div className="rounded-lg bg-surface-card p-3 text-sm text-muted">Escalation path</div>
                      </div>
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold text-ink">{row.title}</h3>
                  <p className="mt-3 text-base leading-7 text-body">{row.copy}</p>
                </div>
                <Link href={row.href} className="btn-text-link mt-6">
                  Explore surface
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="pb-8">
        <div className="page-container">
          <div className="cta-band text-center">
            <h2 className="display-subsection">Smarter coordination starts before the emergency peaks.</h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-body">
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
