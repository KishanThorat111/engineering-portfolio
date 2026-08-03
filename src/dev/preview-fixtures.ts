/**
 * Fixtures for the `/dev/components` gallery.
 *
 * These are preview inputs, not published content — but the Truth Constitution
 * still applies, because this page is deployed even though it is excluded from
 * search. Every fact below is true and traceable to a knowledge base; nothing
 * here is invented filler. If a component ever needs fake data to look good,
 * that is a finding about the component, not a licence to invent.
 *
 * The limitation and metric fixtures are parsed through the real schemas at
 * build time, so a fixture that violates the constitution fails the build in
 * exactly the way a content file would.
 */
import { limitationSchema, qualifiedMetricSchema } from '../schemas/constitution';
import type { Status } from '../schemas/constitution';

/**
 * Case-study links point at `/` because the case-study routes ship in Phases
 * 4–5 and the CI link gate rightly refuses to let a dead internal link into
 * the build. The gallery demonstrates the card's appearance and semantics; the
 * real page supplies the real href.
 */
const PREVIEW_HREF = '/';

export const previewSystems: Array<{
  title: string;
  status: Status;
  statusDetail?: string;
  problem: string;
  stack: string[];
  href: string;
}> = [
  {
    title: 'Hospital housekeeping operations',
    status: 'IN_PRODUCTION_HOSPITAL',
    problem:
      'Cleaning had to be provable in a clinical setting, not just reported by the person who did it.',
    stack: ['Node.js / Fastify', 'PostgreSQL / Prisma', 'GCP'],
    href: PREVIEW_HREF,
  },
  {
    title: 'Digital menu platform',
    status: 'LIVE',
    problem:
      'Restaurants needed a menu a customer reaches by scanning a QR code, and billing that survives a double-fired payment.',
    stack: ['Fastify', 'PostgreSQL', 'Razorpay'],
    href: PREVIEW_HREF,
  },
  {
    title: 'Electrical inspection platform',
    status: 'PRE_LAUNCH',
    statusDetail: 'Q3 2026',
    problem:
      'Facilities teams needed structured electrical inspections and guest fault reporting in one system.',
    stack: ['Fastify', 'PostgreSQL', 'AWS'],
    href: PREVIEW_HREF,
  },
];

/** Both real decisions, drawn from the Electrical platform's ADR set. */
export const previewDecisions = [
  {
    title: 'ADR 0004 — resilience as shared primitives',
    decision:
      'Wire circuit breakers into a Prisma client extension and one shared AI-calling function, so every call site inherits protection.',
    why: 'The earlier arrangement had both breakers wired into almost nothing, so coverage depended on each author remembering to opt in.',
    tradeoff:
      'A shared primitive is harder to reason about at a single call site, and the extension covers per-model operations rather than every raw query.',
  },
  {
    title: 'ADR 0003 — shared database with orgId row scoping',
    decision:
      'Keep one database and scope every tenant-owned row by a server-derived orgId, rather than a database or schema per tenant.',
    why: 'Database-per-tenant multiplies migration, connection, and provisioning overhead beyond what one engineer can carry.',
    tradeoff:
      'Isolation now depends on a discipline that must be enforced by tests, which is why a tenant-isolation suite exists per resource.',
    aged: 'Application-only scoping with no orgId column was rejected outright: isolation resting purely on developer memory has no backstop.',
  },
];

/**
 * Real disclosed limitations, parsed through the schema that governs the
 * published ones. The hospital platform's missing test suite is the site's
 * most important disclosure and belongs in the gallery as the reference case.
 */
export const previewLimitations = [
  limitationSchema.parse({
    limitation:
      'The hospital platform has no automated test suite, so every deploy depends on manual verification.',
    addressedBy:
      'The next platform launched behind a readiness programme with CI-gated tests before its first user.',
    source: { document: 'KB:WTMS', ref: '§14 Testing and §15 finding 1' },
  }),
  limitationSchema.parse({
    limitation:
      'Real-time notification delivery runs from an in-process registry, so it is correct on one instance only.',
    addressedBy:
      'Documented as the stated boundary before horizontal scaling, with the two candidate fixes recorded.',
    source: { document: 'KB:ELES', ref: '§12 Notifications and §14 scaling readiness' },
  }),
];

/** Real measurements, parsed through the schema that forbids an undated number. */
export const previewMetrics = [
  qualifiedMetricSchema.parse({
    value: '256',
    caption: 'CI-gated tests passing at the readiness audit',
    qualifier: 'Electrical platform, as of Jul 2026',
    source: { document: 'KB:ELES', ref: '§17 Testing — 256 passing at the audit' },
  }),
  qualifiedMetricSchema.parse({
    value: '17',
    caption: 'Work packages in the production-readiness programme',
    qualifier: 'Electrical readiness programme, as of Jul 2026',
    source: { document: 'KB:ELES', ref: '§1 — the WP1–WP17 hardening programme' },
  }),
];

/** Both experience states: an NDA-bound engagement and an ordinary one. */
export const previewExperience = [
  {
    role: 'Software Engineer',
    organisation: 'Vedha IT Solutions',
    from: 'Nov 2025',
    to: 'Present',
    confidential: true,
    bullets: [
      'Operate a self-hosted n8n automation platform on Azure, with Redis queued execution so production workflows run reliably.',
    ],
  },
  {
    role: 'Full-Stack Developer (Freelance)',
    organisation: 'Avant Data Ltd',
    from: 'Jun 2023',
    to: 'Dec 2025',
    confidential: false,
    bullets: [
      'Delivered a full-stack e-commerce application the company adopted as its internal reference for demonstrations.',
      'Automated build and deployment with GitHub Actions to Azure.',
    ],
  },
];

/** The four statuses, so the badge is visible in every state it can hold. */
export const previewStatuses: Array<{ status: Status; detail?: string }> = [
  { status: 'IN_PRODUCTION_HOSPITAL' },
  { status: 'LIVE' },
  { status: 'PRE_LAUNCH', detail: 'Q3 2026' },
  { status: 'CONFIDENTIAL' },
];
