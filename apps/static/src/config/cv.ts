/**
 * CV content — transcribed from the PRIMARY CV in docs/CV_SOURCE.md.
 *
 * Structured rather than written straight into the page so that /cv, the
 * generated PDF, and the Phase 7 machine layer read one source and cannot
 * drift apart (constitution rule 10). The PDF is printed from the rendered
 * page, so site and PDF state identical facts by construction rather than by
 * two people remembering to update both.
 *
 * Three constitutional edits to the source wording, all narrowing:
 *
 * 1. The CV's "KodSpot (registered product practice)" becomes "Independent
 *    product engineering — the KodSpot platform suite". Ruling 1 presents the
 *    subject exclusively as an engineer, and KodSpot exclusively as a body of
 *    engineering work rather than a venture.
 * 2. Figures carry absolute date qualifiers. Ruling 3 requires "as of Jul
 *    2026" on the Electrical readiness figures specifically; the Confluence
 *    figure takes the CV's own date. A qualifier narrows a claim, so this
 *    stays inside Ruling 4's "never exceeds CV wording".
 * 3. The profile's "Currently delivering" becomes "Delivering … since November
 *    2025". Blueprint §3.5 bans relative dating: "currently" is false the
 *    moment it stops being true, while a date stays true forever.
 *
 * Platform domains appear as plain text, never as links. They are the
 * subject's own platforms and belong in a CV, but blueprint Ruling 1 records
 * that one page on that domain uses language this portfolio does not, so the
 * portfolio does not route a reader there.
 */

export interface CvRole {
  title: string;
  organisation: string;
  period: string;
  /** Italic context line under the role heading. */
  note?: string;
  bullets: string[];
  /** Sub-entries — used for the three platforms under independent engineering. */
  platforms?: Array<{ name: string; meta: string; bullets: string[] }>;
}

export const CV_PROFILE =
  'Software engineer who takes systems from design through to operated production. ' +
  'Delivering AI workflow automation for a UK enterprise client since November 2025, while ' +
  'independently building and running three multi-tenant SaaS platforms — one used daily ' +
  'inside a hospital, one live commercially with subscription billing. Strong full-stack ' +
  'foundations (Node.js, PostgreSQL, TypeScript, cloud) combined with modern AI-assisted ' +
  'development practice; personally accountable for architecture, code review, security, ' +
  'tenant isolation, and production operations.';

export const CV_ROLES: readonly CvRole[] = [
  {
    title: 'Software Engineer',
    organisation: 'Vedha IT Solutions Pvt Ltd (Remote, India)',
    period: 'Nov 2025 – Present',
    note: 'Deployed to a UK-based client on an enterprise operations platform.',
    bullets: [
      'Operate a self-hosted n8n automation platform on Azure, configured with Redis queued execution so multiple customers’ production workflows run reliably at scale.',
      'Shipped production AI workflows for client businesses — WhatsApp customer-support chatbots, multi-tool booking agents, and automated CV screening that evaluates candidates and emails recruiters ranked summaries (Azure OpenAI, MongoDB, Azure Blob Storage).',
      'Cut new-client chatbot onboarding to a zero-touch process by generating workflow configurations programmatically — credentials, tokens, webhooks — and deploying them through the n8n REST API.',
      'Built the platform’s engineering knowledge base from scratch: 1,500+ Confluence pages across 10 team spaces (as of Aug 2026), giving ten cross-functional teams a shared, navigable map of the microservices architecture.',
      'Audited repositories and documentation for UK GDPR and India DPDP compliance, then worked with developers to close the gaps found.',
      'Kept releases on track by coordinating QA priorities — surfacing complex defects through regression testing and database validation — and by breaking requirements into developer tasks, with twice-daily stand-ups and AI-generated action-item tracking from meeting transcripts.',
    ],
  },
  {
    title: 'Independent product engineering',
    organisation: 'The KodSpot platform suite',
    period: 'Feb 2026 – Present',
    note: 'Sole engineer for three multi-tenant SaaS platforms — architecture, build, deployment, security, and live operations — developed outside primary employment. Shared foundation: Node.js/Fastify, PostgreSQL/Prisma, Docker, GitHub Actions CI/CD, Cloudflare R2, strict per-organisation tenant isolation.',
    bullets: [],
    platforms: [
      {
        name: 'KodSpot Housekeeping (WTMS)',
        meta: 'In daily production at a hospital · app.kodspot.in · GCP',
        bullets: [
          'Built the operations platform a hospital now relies on daily: QR-verified cleaning with photo evidence and duplicate-photo fraud detection, staff attendance and leave management, maintenance ticketing with public QR reporting, and NABH accreditation compliance reports.',
          'Designed the AI assistant for cost first: an SQL-first router answers most operational questions at zero model cost, with per-organisation token budgets, usage alerts, and prompt-injection detection across Vertex AI, Gemini, and Azure OpenAI.',
          'Engineered for India’s DPDP Act from day one — AES-256 encryption of sensitive PII at rest, personal-data export, automatic anonymisation of guest contact details, and full audit trails.',
        ],
      },
      {
        name: 'KodSpot Menu',
        meta: 'Live commercial SaaS · kodspot.com',
        bullets: [
          'Run a live subscription business on my own payments engineering: Razorpay billing with idempotent activation across webhook and client paths, duplicate-charge protection on renewals, a 14-day trial funnel, and a full plan upgrade/downgrade lifecycle.',
          'Chose privacy by design for analytics — hashed, salted visitor identifiers, no raw IP storage — with DPDPA-aligned retention including six-year payment records for GST compliance.',
        ],
      },
      {
        name: 'KodSpot Electrical Platform',
        meta: 'Pre-launch (Q3 2026) · AWS',
        bullets: [
          'Hardened the platform through a formal 17-work-package production-readiness programme: an enforced engineering charter, documented architecture decisions, and 256 CI-gated automated tests (as of Jul 2026) — including a tenant-isolation regression suite for every tenant-owned resource.',
          'Built resilience as shared primitives rather than per-feature effort — database and AI-provider circuit breakers, lock-safe scheduled jobs, and health-gated deployments that stop broken changes reaching production.',
        ],
      },
    ],
  },
  {
    title: 'Full-Stack Developer (Freelance)',
    organisation: 'Avant Data Ltd, UK (Remote)',
    period: 'Jun 2023 – Dec 2025',
    bullets: [
      'Delivered a full-stack e-commerce application (Angular, TypeScript, Node.js, MongoDB, JWT authentication) that the company adopted as its internal reference for demonstrations; automated build and deployment with GitHub Actions to Azure.',
      'Built and SEO-optimised websites for Avant Data and a partner agency; tested APIs with Postman and Selenium.',
    ],
  },
];

export const CV_EARLIER_CAREER =
  'Earlier career (2018–2022): operations supervision (Ace Comfort Solutions) and teaching ' +
  '(KLE International School) alongside a distance master’s degree, before a full-time ' +
  'transition into software engineering across 2022 and 2023.';

export const CV_SKILLS: ReadonlyArray<{ label: string; value: string }> = [
  { label: 'Languages', value: 'JavaScript, TypeScript, Python, SQL' },
  {
    label: 'Backend',
    value:
      'Node.js, Fastify, Express.js, REST APIs, Prisma ORM, Zod validation, JWT/bcrypt authentication',
  },
  {
    label: 'Frontend',
    value: 'React, Angular, progressive web apps (vanilla JS), Astro, Tailwind CSS, SCSS',
  },
  { label: 'Databases', value: 'PostgreSQL, MongoDB, MySQL, Redis' },
  {
    label: 'Cloud & DevOps',
    value:
      'Docker, Docker Compose, GitHub Actions CI/CD, AWS (EC2, S3), Azure (VMs, Blob Storage, DevOps), GCP (Compute Engine, Vertex AI), Caddy, Nginx, Cloudflare R2',
  },
  {
    label: 'AI engineering',
    value:
      'Azure OpenAI, Vertex AI / Gemini, n8n workflow automation, LangChain, prompt engineering, LLM cost controls, prompt-injection defence',
  },
  {
    label: 'Security & compliance',
    value:
      'Multi-tenant isolation, AES-256-GCM PII encryption, rate limiting, UK GDPR and India DPDP audit experience',
  },
  {
    label: 'Quality & process',
    value:
      'Integration testing (node:test), Selenium, Postman, CI test gating, architecture decision records, Confluence, JIRA',
  },
];

export const CV_EDUCATION: ReadonlyArray<{
  qualification: string;
  institution: string;
  period: string;
}> = [
  {
    qualification: 'B.E., Electrical & Electronics Engineering',
    institution: 'Visvesvaraya Technological University (AITM), India',
    period: '2014 – 2018',
  },
  {
    qualification: 'M.Sc., Yoga',
    institution: 'Annamalai University (distance education), India',
    period: '2020 – 2022',
  },
];

/**
 * Certifications appear here as a single line and nowhere else on the site.
 * Blueprint §3.4 removes the certificate wall entirely: at the level being
 * claimed, certificates are metadata, and foregrounding them lowers the
 * perceived level rather than raising it.
 */
export const CV_CERTIFICATIONS =
  'Career Essentials in Generative AI (Microsoft) · DevOps Professional Certificate ' +
  '(PagerDuty & LinkedIn) · MLOps Fundamentals (Scaler) · JavaScript Foundations ' +
  'Professional Certificate (Mozilla)';
