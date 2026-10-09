import React from 'react';
import { Link } from 'react-router-dom';
import { getDashboardRoute, useAuth } from '../context/AuthContext';
import {
  AlertIcon,
  AnalyticsIcon,
  ArrowRightIcon,
  BehaviorIcon,
  BoltIcon,
  CheckCircleIcon,
  ChatIcon,
  ClockIcon,
  DatabaseIcon,
  DocumentIcon,
  EyeIcon,
  GlobeIcon,
  InvestigationIcon,
  LockIcon,
  ShieldIcon,
  ShieldAlertIcon,
  SparkIcon,
  TrendUpIcon,
} from '../components/icons';

/* ── Data ────────────────────────────────────────────────────────────────── */

const FEATURES = [
  {
    icon: BoltIcon,
    title: 'Real-time risk scoring',
    body: 'Every transaction is scored the moment it lands — rules, anomaly detection and fraud models combined into one explainable risk score.',
  },
  {
    icon: BehaviorIcon,
    title: 'Behavioral analytics',
    body: 'Per-user baselines for amount, timing, devices and locations. Deviations surface as behavioural risk before fraud happens.',
  },
  {
    icon: AnalyticsIcon,
    title: 'Explainable AI',
    body: 'SHAP-based model explanations show exactly which features pushed each score up or down — no black boxes for your reviewers.',
  },
  {
    icon: ShieldAlertIcon,
    title: 'Alert triage & workflows',
    body: 'Prioritised alert queue with open / investigating / resolved states so analysts always work the highest-risk item first.',
  },
  {
    icon: InvestigationIcon,
    title: 'AI investigation agent',
    body: 'Ask questions in plain English. The agent answers strictly from live records and links every claim back to its source.',
  },
  {
    icon: DocumentIcon,
    title: 'Audit-ready reporting',
    body: 'Every action, score change and decision is recorded with timestamps — ready for internal audit and regulatory review.',
  },
];

const STEPS = [
  {
    number: '01',
    title: 'Ingest',
    body: 'Transactions, vendors and user activity stream in over REST or Socket.IO with zero schema changes to your stack.',
  },
  {
    number: '02',
    title: 'Score',
    body: 'The hybrid engine combines deterministic rules, isolation-forest anomaly detection and a gradient-boosted fraud model.',
  },
  {
    number: '03',
    title: 'Act',
    body: 'Analysts triage alerts, drill into explanations and close cases — while the AI agent handles the first pass of legwork.',
  },
];

const HIGHLIGHTS = [
  { icon: LockIcon, text: 'Role-based access for Admin, Analyst and Auditor' },
  { icon: EyeIcon, text: 'Full traceability from alert back to raw record' },
  { icon: DatabaseIcon, text: 'Runs against your own database and models' },
  { icon: GlobeIcon, text: 'Webhook + real-time socket notifications' },
];

const STATS = [
  { value: '< 100ms', label: 'Median scoring latency' },
  { value: '4 layers', label: 'Rules, anomaly, fraud, behaviour' },
  { value: '100%', label: 'Scores with explanations' },
  { value: '24/7', label: 'Continuous monitoring' },
];


/* ── Page ────────────────────────────────────────────────────────────────── */

export default function Landing() {
  const { user } = useAuth();
  const consoleHref = user ? getDashboardRoute(user.role) : '/register';

  return (
    <div className="min-h-screen bg-white text-slate-900 antialiased">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-brand-300">
              <ShieldIcon className="h-5 w-5" />
            </span>
            <span className="flex flex-col leading-tight">
              <span className="text-sm font-bold tracking-tight text-slate-900">
                RiskShield AI
              </span>
              <span className="text-[11px] font-medium text-slate-500">
                Enterprise Risk Intelligence
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-7 text-sm font-medium text-slate-600 md:flex">
            <a href="#features" className="transition-colors hover:text-slate-900">
              Platform
            </a>
            <a href="#how-it-works" className="transition-colors hover:text-slate-900">
              How it works
            </a>
            <a href="#security" className="transition-colors hover:text-slate-900">
              Security
            </a>
          </nav>

          <div className="flex items-center gap-2.5">
            {user ? (
              <Link to={consoleHref} className="btn-primary !py-2 text-sm">
                Open Console
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
            ) : (
              <>
                <Link to="/login" className="btn-ghost hidden !py-2 text-sm sm:inline-flex">
                  Sign in
                </Link>
                <Link to="/register" className="btn-primary !py-2 text-sm">
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_50%_at_50%_0%,#eef2ff_0%,transparent_70%)]"
        />
        <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-16 sm:px-6 sm:pt-24">
          <div className="animate-rise mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3.5 py-1.5 text-xs font-semibold text-brand-700">
              <SparkIcon className="h-3.5 w-3.5" />
              AI-native financial crime &amp; risk platform
            </span>
            <h1 className="mt-6 text-4xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Detect risk before it{' '}
              <span className="bg-gradient-to-r from-brand-600 to-indigo-400 bg-clip-text text-transparent">
                becomes loss
              </span>
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-slate-600 sm:text-xl">
              RiskShield AI unifies rules, anomaly detection, behavioural
              baselines and explainable machine learning into one real-time
              command centre — so your analysts stop chasing noise and start
              closing cases.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                to={consoleHref}
                className="btn-primary w-full !px-6 !py-3 text-base sm:w-auto"
              >
                {user ? 'Open Console' : 'Start free — create account'}
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
              {!user && (
                <Link
                  to="/login"
                  className="btn-secondary w-full !px-6 !py-3 text-base sm:w-auto"
                >
                  Sign in to console
                </Link>
              )}
            </div>
            <p className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-500">
              <CheckCircleIcon className="h-4 w-4 text-emerald-500" />
              No credit card required · Analyst &amp; Admin roles included
            </p>
          </div>

          {/* Console preview card */}
          <div className="animate-rise mt-14 rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/5">
            <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
              <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
              <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
              <span className="ml-3 text-xs font-medium text-slate-400">
                riskshield / risk-intelligence-center
              </span>
              <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                Live
              </span>
            </div>

            <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: 'Total Transactions', value: '128,430', note: '+4.2% vs prior period' },
                { label: 'High-Risk Items', value: '1,204', note: '0.94% of volume' },
                { label: 'Open Alerts', value: '37', note: '6 critical' },
                { label: 'Anomalies Detected', value: '512', note: 'Isolation Forest' },
              ].map((kpi) => (
                <div
                  key={kpi.label}
                  className="rounded-xl border border-slate-200 bg-slate-50/70 p-4"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    {kpi.label}
                  </p>
                  <p className="mt-1.5 text-2xl font-bold tabular-nums text-slate-900">
                    {kpi.value}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{kpi.note}</p>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-100 px-4 pb-4 pt-3">
              <div className="flex h-24 items-end gap-1.5">
                {[35, 52, 44, 68, 58, 82, 74, 96, 70, 88, 62, 78].map(
                  (height, index) => (
                    <div
                      key={index}
                      className={`flex-1 rounded-t transition-colors ${
                        index === 7 ? 'bg-brand-500' : 'bg-brand-100'
                      }`}
                      style={{ height: `${height}%` }}
                    />
                  ),
                )}
              </div>
              <p className="mt-2 text-[11px] text-slate-400">
                Risk volume — last 12 periods (illustrative preview)
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats strip ────────────────────────────────────────────────── */}
      <section className="border-y border-slate-200 bg-slate-50">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-10 sm:px-6 lg:grid-cols-4">
          {STATS.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-3xl font-extrabold tracking-tight text-slate-900">
                {stat.value}
              </p>
              <p className="mt-1 text-sm text-slate-500">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>


      {/* ── Features ───────────────────────────────────────────────────── */}
      <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow text-brand-600">Platform</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Everything a risk team needs, in one console
          </h2>
          <p className="mt-4 text-slate-600">
            Purpose-built modules that work together — from ingestion to
            case closure — without stitching together five different tools.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => {
            const FeatureIcon = feature.icon;
            return (
              <article
                key={feature.title}
                className="group rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md"
              >
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-brand-50 text-brand-600 transition-colors group-hover:bg-brand-600 group-hover:text-white">
                  <FeatureIcon className="h-5.5 w-5.5" />
                </span>
                <h3 className="mt-4 text-base font-semibold text-slate-900">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {feature.body}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────────────────── */}
      <section id="how-it-works" className="scroll-mt-20 bg-slate-950 text-white">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="eyebrow text-brand-400">How it works</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              From raw event to resolved case
            </h2>
            <p className="mt-4 text-slate-400">
              A single pipeline scores, explains and routes risk — then keeps
              a full audit trail of every decision.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {STEPS.map((step) => (
              <div
                key={step.number}
                className="rounded-xl border border-slate-800 bg-slate-900/60 p-6"
              >
                <span className="text-sm font-bold tracking-widest text-brand-400">
                  {step.number}
                </span>
                <h3 className="mt-3 text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  {step.body}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-sm text-slate-300">
            <span className="inline-flex items-center gap-2">
              <TrendUpIcon className="h-4 w-4 text-brand-400" />
              Hybrid scoring engine
            </span>
            <span className="inline-flex items-center gap-2">
              <ClockIcon className="h-4 w-4 text-brand-400" />
              Live socket updates
            </span>
            <span className="inline-flex items-center gap-2">
              <AlertIcon className="h-4 w-4 text-brand-400" />
              Instant critical alerts
            </span>
            <span className="inline-flex items-center gap-2">
              <ChatIcon className="h-4 w-4 text-brand-400" />
              AI-assisted investigations
            </span>
          </div>
        </div>
      </section>


      {/* ── Security & governance ──────────────────────────────────────── */}
      <section id="security" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <p className="eyebrow text-brand-600">Security &amp; governance</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Built for teams that answer to auditors
            </h2>
            <p className="mt-4 leading-relaxed text-slate-600">
              Least-privilege by design. Every score, alert transition and
              investigation is attributable to a named user and a timestamp —
              and the AI agent is read-only by construction.
            </p>
            <ul className="mt-8 space-y-4">
              {HIGHLIGHTS.map((highlight) => {
                const HighlightIcon = highlight.icon;
                return (
                  <li key={highlight.text} className="flex items-start gap-3">
                    <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                      <HighlightIcon className="h-4 w-4" />
                    </span>
                    <span className="text-sm font-medium text-slate-700">
                      {highlight.text}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 sm:p-8">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Alert #4821
                </span>
                <span className="rounded bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-700">
                  CRITICAL
                </span>
              </div>
              <p className="mt-3 text-sm font-semibold text-slate-900">
                Velocity anomaly on outgoing transfer
              </p>
              <p className="mt-1 text-xs text-slate-500">
                6 transfers in 4 minutes · 9.2× user baseline
              </p>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-2 w-[92%] rounded-full bg-red-500" />
              </div>
              <p className="mt-1.5 flex justify-between text-[11px] text-slate-500">
                <span>Risk score</span>
                <span className="font-semibold text-slate-700">92 / 100</span>
              </p>
            </div>

            <div className="mt-4 space-y-3">
              {[
                'Anomaly model flagged (isolation forest)',
                'Behavioural baseline exceeded by 9.2×',
                'SHAP: amount + velocity drive 81% of score',
              ].map((line) => (
                <div
                  key={line}
                  className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs text-slate-600"
                >
                  <CheckCircleIcon className="h-4 w-4 shrink-0 text-brand-500" />
                  {line}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>


      {/* ── CTA ────────────────────────────────────────────────────────── */}
      <section className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            See your risk posture in minutes
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-slate-600">
            Create an account to explore the live console, or sign in if your
            team is already onboarded.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to={consoleHref}
              className="btn-primary w-full !px-6 !py-3 text-base sm:w-auto"
            >
              {user ? 'Open Console' : 'Create your account'}
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
            {!user && (
              <Link
                to="/login"
                className="btn-secondary w-full !px-6 !py-3 text-base sm:w-auto"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-800 bg-slate-950 text-slate-400">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-4 py-10 sm:px-6 md:flex-row">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-brand-400 ring-1 ring-slate-800">
              <ShieldIcon className="h-4 w-4" />
            </span>
            <div className="leading-tight">
              <p className="text-sm font-semibold text-white">RiskShield AI</p>
              <p className="text-xs">Enterprise risk intelligence platform</p>
            </div>
          </div>

          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
            <a href="#features" className="transition-colors hover:text-white">
              Platform
            </a>
            <a href="#how-it-works" className="transition-colors hover:text-white">
              How it works
            </a>
            <a href="#security" className="transition-colors hover:text-white">
              Security
            </a>
            <Link to="/login" className="transition-colors hover:text-white">
              Sign in
            </Link>
          </nav>

          <p className="text-xs">
            © {new Date().getFullYear()} RiskShield AI. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
