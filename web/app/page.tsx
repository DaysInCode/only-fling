import Link from "next/link";
import { ConnectorPreview } from "./sections/connector-preview";
import { HealthStatus } from "./sections/health-status";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.page}>
      <div className="shell">
        <nav className="nav">
          <div className="brand">OnlyFling Starter</div>
          <div className="navLinks">
            <Link href="/auth/sign-in">Sign in</Link>
            <Link href="/onboarding">Onboarding</Link>
            <Link href="/collaboration">Collaboration</Link>
            <Link href="/marketplace">Marketplace</Link>
            <Link href="/plugins">Plugins</Link>
            <Link href="/admin">Admin</Link>
          </div>
        </nav>

        <section className="section pageGrid">
          <div className="heroCard">
            <div className="eyebrow">Adult-only creator marketplace starter</div>
            <h1 className="heroTitle">Mobile-first growth, five-click onboarding, secure creator operations.</h1>
            <p className="heroLead">
              This starter turns the raw requirements into a safe, compliant platform for adult creators and
              merchants: fast sign-up, gamified activation, referral loops, marketplace sales, admin-only oversight,
              and plugin-ready publishing workflows.
            </p>
            <div className="heroActions">
              <Link className="button" href="/auth/sign-in">
                Start sign-in
              </Link>
              <Link className="buttonSecondary" href="/onboarding">
                Reach first upload in under 5 minutes
              </Link>
            </div>
          </div>

          <div className="stack">
            <div className="panel">
              <div className="label">Activation loop</div>
              <div className="kpi">5 min</div>
              <p className="muted">Terms → profile → upload token → first item draft → invite link.</p>
            </div>
            <div className="panel">
              <div className="label">Growth strategy</div>
              <p className="muted">
                Inspired by Temu’s mobile-first playbook: clear rewards, short flows, social invites, and constant
                refinement using usage data rather than guesswork.
              </p>
            </div>
            <HealthStatus />
          </div>
        </section>

        <section className="section cardGrid">
          <div className="card">
            <div className="label">Invite-first growth</div>
            <h2>Reward creators for bringing others in.</h2>
            <p className="muted">
              Free and paid accounts both get invite links, milestone rewards, and rank boosts for verified, active
              referrals.
            </p>
          </div>
          <div className="card">
            <div className="label">Marketplace ready</div>
            <h2>Sell digital goods, physical goods, or service requests.</h2>
            <p className="muted">
              Commission rules, Stripe-ready adapters, and moderation checkpoints are structured into the API.
            </p>
          </div>
          <div className="card">
            <div className="label">Compliance by default</div>
            <h2>UK/EU-friendly data handling from day one.</h2>
            <p className="muted">
              Private blob storage, audited admin access, consent capture, GDPR/PIPL-aware region controls, and no
              cross-account access.
            </p>
          </div>
        </section>

        <section className="section pageGrid">
          <div className="panel">
            <div className="label">What ships in this starter</div>
            <ul className="list">
              <li>Passwordless sign-in and session token bootstrap</li>
              <li>Five-click onboarding flow with terms and marketplace policy acceptance</li>
              <li>Gamified creator dashboard with ranks, rewards, and referral positioning</li>
              <li>Plugin catalogue with MCP-ready connector metadata</li>
              <li>Secure upload URL issuance for Azure Blob storage</li>
              <li>Admin-only audit trail and moderation queue endpoints</li>
            </ul>
          </div>
          <ConnectorPreview />
        </section>

        <section className={`section ${styles.lightSection}`}>
          <div className="shell cardGrid">
            <div className="card surfaceLight">
              <div className="label">Temu-inspired principles applied safely</div>
              <ul className="list">
                <li>Mobile-first layouts and compact actions</li>
                <li>Visible rewards, ranking, and social proof</li>
                <li>Low-friction onboarding with immediate payoff</li>
                <li>Referral loops and milestone incentives</li>
                <li>Continuous iteration from funnel analytics</li>
              </ul>
            </div>
            <div className="card surfaceLight">
              <div className="label">Starter account model</div>
              <ul className="list">
                <li>Free: profile, uploads, one storefront, one invite link</li>
                <li>Paid: advanced analytics, connector installs, priority moderation, higher reward bands</li>
                <li>Admin: full audited oversight, no cross-account leakage</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
