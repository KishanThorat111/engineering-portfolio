/**
 * Every visitor-facing string on this surface. A4, binding.
 *
 * WHY ONE MODULE AND WHY IT IS EMITTED AS DATA
 * The repository's copy gate scans built output for banned words, and it cannot
 * scan minified JavaScript — bundled third-party code carries `owner` and
 * `clients` as identifiers in volumes that would drown any real signal. Copy
 * that reached the build only as literals scattered through components would
 * therefore ship past rule 5 unchecked. This module is written out as
 * `copy.json` at build time (see vite.config.ts) so the gate has something to
 * read.
 *
 * That constraint and rule 10 want the same shape, which is the sign it is the
 * right one: one content source, two renderings, unable to disagree.
 *
 * VOICE (blueprint §3.1): first person, plain, specific, calm. Short sentences.
 * The register of a senior engineer's design doc. Every claim here traces to
 * the dossier, the CV, or a knowledge base — nothing is invented, no figure
 * appears without its date, and the demo says it is a demo unprompted.
 */

export const COPY = {
  /** The one-line identity. Locked wording, blueprint §1. */
  claim: 'I design, build, and operate production systems.',

  /** Rule 11: the demo is labelled a demo, everywhere, unprompted. */
  disclosure: {
    label: 'DEMO PLANE',
    short: 'A real system, built to be attacked. Separate from anything in production.',
    full:
      'This is the demo plane. It is a physically separate database with no path to any ' +
      'production system, every tenant it creates is destroyed on a TTL by a scheduled job, ' +
      'and it is deliberately attackable. Nothing here is a simulation: every event you see ' +
      'is a committed audit row.',
  },

  /** The five-beat arc, §2.1. Names and one honest line each. */
  beats: {
    arrival: {
      name: 'Arrival',
      line: 'The system is answering. These numbers are yours.',
    },
    recognition: {
      name: 'Recognition',
      line: 'Three planes — edge, application, data. Other tenants are in here now.',
    },
    ownership: {
      name: 'Ownership',
      line: 'This volume is yours. Real rows, real latency.',
    },
    confrontation: {
      name: 'Confrontation',
      line: 'Another tenant is over there. Its identifier is on screen.',
    },
    consequence: {
      name: 'Consequence',
      line: 'Your tenant reaches its TTL and a scheduled job destroys it.',
    },
  },

  /** In-world plane labels, §2.3. Monospace, part of the machine. */
  planes: {
    edge: 'EDGE',
    application: 'APPLICATION',
    data: 'DATA',
  },

  /** The accessible document. This is the page when the canvas is not. */
  document: {
    title: 'A live demonstration plane',
    intro:
      'This page renders a real multi-tenant system from its own telemetry. Everything drawn ' +
      'here is described in text below, and the text is the authoritative version: if the ' +
      'scene and this document ever disagree, believe the document.',
    sceneSummary: 'What the scene is showing',
    eventLogHeading: 'Live event log',
    eventLogDescription:
      'Every event the system has emitted since this page loaded, newest first. Each one is a ' +
      'committed audit row with its own identifier.',
    emptyLog:
      'No events yet. The world is quiet because it is quiet — nothing is being generated to ' +
      'fill the silence.',
    quietWorld:
      'Nothing is happening right now. That is the honest state, not a loading screen: this ' +
      'surface never manufactures activity it does not have.',
  },

  /** Motion is measurement (§3.6), stated so the visitor knows what to read. */
  legend: {
    heading: 'How to read this',
    items: [
      'Packet speed is latency. A slow packet was a slow request.',
      'Brightness is load. A quiet system is genuinely darker.',
      'Cold cyan is the isolation boundary, and nothing else. When you see it, you were stopped.',
      'A packet with no measured duration is drawn dashed. Unmeasured is not the same as instant.',
    ],
  },

  /** §6.3. Degraded says so, in the world, in plain words. */
  degraded: {
    badge: 'REPLAY',
    heading: 'The live plane is unreachable',
    body:
      'This is a recording of real traces captured from this system, replayed at the speed ' +
      'they actually happened. It is not live and it is not pretending to be. The control ' +
      'plane is a single VM; when it is down, it is down.',
    recordedNote: 'Recorded from a real session',
  },

  connecting: {
    heading: 'Connecting to the live plane',
    body: 'Opening a socket to the control plane.',
  },

  /** Adaptive quality (§11): automatic, never a question put to the visitor. */
  quality: {
    note: 'Rendering quality adapts to your device automatically. There is nothing to choose.',
    tiers: {
      1: 'Reduced — sustained frame time was high, so effects were dropped to keep it smooth.',
      2: 'Standard',
      3: 'Full — this device has headroom.',
    },
  },

  reducedMotion: {
    note:
      'Reduced motion is on, so nothing travels or eases. States change instantly and the ' +
      'event log is the primary reading of the system.',
  },

  webglUnavailable: {
    heading: 'This device cannot run the scene',
    body:
      'WebGL is unavailable, so the world is not drawn. Nothing is lost: the event log below ' +
      'carries the same information the scene would have shown, from the same source.',
  },

  /* --- P5: the arrival beat (§2.2) ------------------------------------ */
  arrival: {
    resolving: 'resolving edge',
    tls: 'tls established',
    provisioning: 'provisioning tenant',
    ready: 'tenant live',
    popUnknown: 'edge unknown',
    popNote:
      'That round trip was measured, not estimated. When the edge does not name a location, ' +
      'this says unknown rather than guessing one.',
    failed: 'The control plane did not answer. Nothing was provisioned.',
  },

  /* --- P5: the stations (§2.6). Invite, never instruct (§3.9). -------- */
  stations: {
    heading: 'Four capabilities, and a boundary',
    lede:
      'Each of these is a real mechanism you can attempt to defeat. Nothing below is a ' +
      'simulation: every action writes an audit row and emits a span.',
    isolation: {
      name: 'Isolation',
      invitation: "Another tenant's record is over there. Its identifier is on screen.",
      action: 'Read it',
      inspect: 'Open the membrane',
      inspectNote:
        'The live policy predicate, the real query plan, and the branch that returned 403 — ' +
        'read from the running database, not described.',
    },
    payments: {
      name: 'Payments',
      invitation: 'Send the same activation twice, at the same moment.',
      action: 'Fire it twice',
      openKey: 'Open the idempotency key',
      note:
        'The race is resolved by a unique constraint, not by reading before writing. Between ' +
        'that read and that write is where a duplicate charge lives.',
    },
    fraud: {
      name: 'Fraud',
      invitation: 'Submit the same photo twice.',
      action: 'Submit twice',
      note:
        'Photo evidence is only evidence if the same photo cannot be submitted again. The ' +
        'image itself is never stored — only its digest.',
    },
    ai: {
      name: 'AI cost',
      invitation: 'Ask something operational. Then ask something it cannot answer.',
      operational: 'How many records do I have?',
      creative: 'Write a haiku about hospital logistics',
      note:
        'The router matches a fixed table of intents, each owning one hand-written statement. ' +
        'It never generates SQL from your question.',
    },
    limits: {
      name: 'Limits',
      invitation: 'Hammer it until it stops accepting.',
      action: 'Send twenty',
      note:
        "Keyed per credential, so one visitor cannot shed another's requests. Cloudflare's " +
        'edge limiter sits in front of this one.',
    },
  },

  /* --- P5: the take-away (§2.10, A14) -------------------------------- */
  takeAway: {
    heading: 'Leave with the evidence',
    body:
      'A signed link carrying your session audit log, the predicate that blocked you, and ' +
      'commands that reproduce the refusal. It keeps working after your tenant is purged.',
    action: 'Get the link',
    copied: 'Copied',
    reproduce: 'Reproduce it yourself',
  },

  /* --- P5: the consequence beat (§2.8) -------------------------------- */
  consequence: {
    heading: 'This tenant expires',
    body:
      'A scheduled job destroys it on its TTL. Not a timer in this page — a worker on the ' +
      'server, taking a Postgres advisory lock and deleting the rows.',
    purged: 'Purged. The data is gone; the record of what happened to it is not.',
  },

  /* --- P6: the estate (§2.7) and the record (§2.8) -------------------- */
  estate: {
    heading: 'One node of four',
    lede:
      'The system you have been inside is the smallest thing here. Beside it are three ' +
      'platforms other people depend on — and those are not yours to break.',
    attackable: 'Yours to break. That is what it is for.',
    notAttackable:
      'Not attackable, and not reachable from this page. It is load-bearing and I am not ' +
      'letting anyone near it.',
    signalLive: 'Live telemetry, rendered from its own events.',
    signalDegraded:
      'Its telemetry is unreachable right now, so this page is replaying a real recording and ' +
      'saying so.',
    signalNone:
      'No live signal published. What may be shown from a system in daily clinical use is a ' +
      'permissions question that has not been answered, so nothing is shown rather than ' +
      'something estimated.',
    limitationsHeading: 'Disclosed limitations',
    permissionsNote:
      "Every status and limitation above is read from this site's own machine-readable " +
      'profile, which is generated from the same content the case studies render. The two ' +
      'cannot disagree, and a CI gate fails the build if they ever do.',
    unavailable:
      'The machine-readable profile could not be read, so the estate is not shown. Three ' +
      'platforms rendered from memory would be exactly the divergence this page is built to ' +
      'make impossible.',
  },

  /* --- R2: reference 01, ENTER (docs/REFERENCE_DECOMPOSITION.md §2) ---- */
  enter: {
    /*
     * The reference's hero is three stacked display lines ending on an
     * emphasised "I operate." The locked claim (blueprint §1, SITE.claim) is
     * "I design, build, and operate production systems." — near enough that
     * the composition can be honoured by LINE-BREAKING the locked wording at
     * its commas rather than rewriting it into the reference's punctuation.
     *
     * CAUGHT AND CORRECTED IN R2: the first version of these lines read
     * "I design, / I build, / and I operate", which matches the reference's
     * rhythm and is NOT the locked sentence — it silently added two pronouns
     * to copy that blueprint §1 locks and whose wording change requires an
     * amendment. Nothing in CI covers the locked claim on this surface, so it
     * was found only by diffing the rendered hero against `claim` above. The
     * reference's rhythm loses; the locked sentence reads verbatim, in order,
     * to a screen reader and to anyone reading down the lines.
     */
    claimLines: ['I design,', 'build,', 'and operate'] as const,
    claimTail: 'production systems.',
    /*
     * The reference's sub-line is "Production systems that scale, adapt, and
     * create real impact." — an invention, and the kind of unfalsifiable claim
     * blueprint §3.1 rules out. This says what is actually true and is
     * checkable against the case studies.
     */
    subline:
      'Three multi-tenant platforms, engineered and operated end to end. This one is a demo ' +
      'you are invited to attack.',
    /*
     * The reference has NO demo label anywhere in frame. Rule 11 requires one,
     * so it takes the eyebrow slot above the hero — the most prominent place
     * it could go, which is the right place for it.
     */
    action: 'Enter the system',
    scroll: 'Scroll to explore',
    /** The left-hand annotation column's heading. */
    layers: 'Architecture',
    /** The right-hand annotation column's heading. */
    capabilities: 'Capabilities',
    /*
     * Reference 01's metrics row reads REQUESTS/MIN 2,487 · AVG LATENCY 32ms ·
     * UPTIME 99.99% · ERROR RATE 0.02%. Uptime and error rate are forbidden
     * outright (rule 7 — no uptime figures exist in evidence), and the other
     * two are inventions. These four are things this page genuinely measures
     * about the visitor's own session, and each says so when it has not.
     */
    metrics: {
      edge: 'Edge round trip',
      events: 'Events this session',
      tenant: 'Your tenant',
      expires: 'Tenant expires',
      unmeasured: 'not measured',
      none: 'not provisioned',
    },
    trace: {
      heading: 'Live request trace',
      empty:
        'No request yet. This panel fills from a committed audit row, so it stays empty until ' +
        'something has actually happened.',
      /*
       * This is the VALUE in a row whose label already reads "Duration", so it
       * says only what is unknown. It read "duration not measured" and rendered
       * as DURATION / duration not measured, which repeats the label and reads
       * like a fault message rather than an honest blank.
       */
      unmeasuredDuration: 'not measured',
    },
  },

  /* --- R3: reference 02, SYSTEMS -------------------------------------- */
  systems: {
    /*
     * The reference sets "Explore the systems I build." with "systems" in a
     * gradient. Kept as three display lines with the emphasis on the noun,
     * because that IS the composition; the wording is plain and checkable
     * rather than the reference's marketing register.
     */
    claimLead: 'Four systems.',
    claimEmphasis: 'Three of them',
    claimTail: 'other people depend on.',
    subline:
      'One stack, operated end to end by one engineer. Each one below discloses the thing it ' +
      'does worst, before you read anything else about it.',
    dissectionTitle: 'Case study sections',
    /** Rule 3's label. Deliberately blunt — a softened word softens the claim. */
    limitationLabel: 'Discloses: ',
    readRecord: 'Read the record',
    enterDemo: 'This is the one you can attack',
    overviewTitle: 'Estate',
    overviewProduction: 'Production systems',
    overviewDemo: 'Demo planes',
    overviewServices: 'Services online',
    overviewNote:
      'The demo is counted apart from the production systems, because it is not one. Service ' +
      'counts are not published — there is no measured figure to publish.',
  },

  /* --- 03 / DISSECTION ------------------------------------------------ */
  dissection: {
    eyebrow: '03 / DISSECTION',
    claimLead: 'How the system',
    claimEmphasis: 'actually',
    claimTail: 'works.',
    subline:
      'Open the architecture. Follow the data. The layers below are this API as it is actually ' +
      'built, not a diagram of it.',
    /*
     * The reference dissects a named production platform. This dissects the
     * demo plane, and says so: it is the only node whose internals can be
     * opened live, and rule 7 forbids opening the hospital one at all.
     */
    subject: 'Demo plane',
    subjectNote:
      'All four systems run this stack. This is the one you can open, because it is the one ' +
      'with nothing real behind it.',
    healthTitle: 'Live system health',
    /*
     * Reference 03's health panel reads AVAILABILITY 99.99% / ERROR RATE 0.02% /
     * LATENCY 35ms / THROUGHPUT 2.48K req/s. Uptime and error-rate figures are
     * forbidden outright by rule 7 and the other two are inventions. These are
     * things this page genuinely measures about its own session.
     */
    health: {
      events: 'Events received',
      latency: 'Slowest span',
      denied: 'Requests refused',
      unmeasured: 'not measured',
    },
    /* The reference's sidebar. Region, deployment and version corrected. */
    meta: {
      title: 'System dissection',
      system: 'System',
      type: 'Type',
      typeValue: 'Multi-tenant demo plane',
      status: 'Status',
      deployment: 'Deployment',
      deploymentValue: 'Docker Compose on one VM',
      isolation: 'Isolation',
      isolationValue: 'PostgreSQL row-level security',
      region: 'Edge',
    },
    statsTitle: 'Countable, and counted',
    stats: {
      migrations: 'Migrations',
      tests: 'Integration tests',
      layers: 'Layers',
      services: 'Demonstrations',
    },
    statsNote:
      'Counts of things in this repository, countable at build time. No service, user or uptime ' +
      'figure appears here because none is measured.',
    traceTitle: 'Request trace',
    traceEmpty:
      'No request yet. Every stage below fills from a real span, so this stays empty until ' +
      'something has actually happened.',
    tracePerStage: 'Only stages this system times individually report a duration. The rest say so.',
    totalTime: 'Total',
    scroll: 'Scroll to trace',
    peel: 'Open the boundary',
  },

  /* --- 04-10: the remaining stations ---------------------------------- */
  data: {
    eyebrow: '04 / DATA',
    claimLead: 'Follow a',
    claimEmphasis: 'request',
    claimTail: 'through the system.',
    subline:
      'One request crosses boundaries, services and data layers before a response reaches you. ' +
      'The capsule below moves at the speed the request actually took.',
    note:
      'Most hops are not timed individually — this system measures the span, not each stage ' +
      'inside it. A stage that was not timed says so.',
    denied: 'This request was refused. It stopped at the service and never reached the data.',
    trace: 'Trace',
  },

  lab: {
    eyebrow: '05 / LAB',
    claimLead: 'Experimental',
    claimEmphasis: 'ground.',
    claimTail: 'Not everything ships.',
    subline:
      'The bench here is the renderer you are looking at. Its frame time and its point count ' +
      'are facts about your machine, measured now.',
    note:
      'Two of these zones measure this renderer and are always real. Two describe the API and ' +
      'go dark when it is unreachable, because there is nothing to report.',
    selectTitle: 'Zones',
    telemetryTitle: 'Renderer telemetry',
    frameTime: 'Frame time',
    points: 'Points in field',
    tier: 'Quality tier',
    unmeasured: 'not measured',
  },

  live: {
    eyebrow: '06 / LIVE',
    claimLead: 'The control',
    claimEmphasis: 'room.',
    claimTail: 'Nothing here is simulated.',
    subline:
      'Observe what is happening. One reading on this globe is genuinely yours: the round trip ' +
      'measured from your own edge on this page load.',
    note:
      'The other markers are places this work exists, not places it is measured. They are shown ' +
      'unlit because no reading was taken — a location is a fact, a latency is a measurement.',
    globeTitle: 'Regions',
    feedTitle: 'Event stream',
    feedEmpty: 'No events. The stream is quiet because the system is quiet.',
    yourEdge: 'Your edge',
  },

  think: {
    eyebrow: '07 / THINK',
    claimLead: 'Systems are only half the story.',
    claimEmphasis: 'The other half is judgment.',
    subline:
      'Knowing what to build, what not to build, what to measure, what to question, and when a ' +
      'simpler system is the better system.',
    axes: ['SIMPLICITY', 'RELIABILITY', 'SCALE', 'COST'],
    heldTitle: 'What I hold to',
    held: [
      'Production operation, not just delivery.',
      'Multi-tenant security as a discipline.',
      'Cost as a first-class engineering input.',
      'Compliance designed in, not bolted on.',
      'Engineering judgment, disclosed honestly.',
    ],
    wrongTitle: 'What I got wrong',
    wrongNote: 'Both of these are written up in full, with what they cost.',
    portraitPending: 'Portrait pending — no owned photograph exists in this repository yet.',
  },

  build: {
    eyebrow: '08 / BUILD',
    claimLead: 'Have a difficult system?',
    claimEmphasis: "Let's build something",
    claimTail: 'worth operating.',
    subline: 'Good engineering starts with the right problem. Bring the constraint.',
    action: 'Start a conversation',
    availableFor: 'Available for',
    stateLabel: 'The next system',
    stateValue: 'UNDEFINED',
    /*
     * Reworded after the copy gate caught the original, which used the
     * literal banned word to say this was not one. The gate was right and
     * was not touched: rule 9 bans the term in built output regardless of
     * the sentence around it, and a gate that reads intent is not a gate.
     */
    stateNote: 'It has no contents yet, and that is the honest state rather than an omission.',
  },

  proof: {
    eyebrow: '09 / PROOF',
    claimLead: 'Inspect.',
    claimEmphasis: 'Understand.',
    claimTail: 'Prove.',
    subline:
      'Every decision leaves a trace. The cabinet holds what this repository actually contains, ' +
      'counted at build time.',
    archiveTitle: 'Archive',
    totalLabel: 'Items in the archive',
    note:
      'These are two-digit counts of things a person wrote and you can read in full. No figure ' +
      'here is rounded up, and none is estimated.',
    openDrawer: 'Open',
  },

  end: {
    eyebrow: '10 / END',
    claimLead: "What's next?",
    claimEmphasis: "Let's find out.",
    subline: 'Good systems solve today’s problem. Great engineering keeps asking what comes after.',
    action: 'Start a conversation',
    systemLabel: 'System',
    systemValue: '[ STANDBY ]',
    nextLabel: 'Next problem',
    /*
     * Preserved verbatim from the reference, and it is the best thing in the
     * whole set: Truth Constitution rule 4 as a design element.
     */
    nextValue: '[ UNKNOWN ]',
    closing: 'Show the system. Show the decision. Show the evidence.',
    visitedTitle: 'Where you went',
    visitedNone: 'You arrived here directly.',
  },

  /* --- S15: the working drawing — the public /live/ ------------------ */
  drawing: {
    pageTitle: 'Live system',
    headline: 'You are inside a real system.',
    headlineRecorded: 'A real system, as it answered.',
    project: 'Demo plane',
    projectDetail: 'A real multi-tenant system, built to be attacked',
    lede:
      'You have your own tenant inside a real running system. Try to break its boundaries. ' +
      'Every line on these sheets is a request that really happened.',
    ledeRecorded:
      'The control plane cannot be reached from here right now, so these sheets play exchanges ' +
      'recorded from real runs of the system. Nothing below is happening now, and nothing is ' +
      'attributed to you.',
    sheetsLabel: 'Sheets',
    sheet: 'Sheet',
    of: 'of',
    titleBlock: 'Title block',
    fields: {
      status: 'Status',
      tenant: 'Tenant',
      validUntil: 'Valid until',
      edge: 'Edge',
      roundTrip: 'Round trip to edge',
      transport: 'Transport',
      channel: 'Live channel',
      visitors: 'Connections now',
      security: 'Security',
      engineer: 'Engineer',
      drawnBy: 'Drawn by',
      checkedBy: 'Checked by',
      revisions: 'Revisions',
    },
    values: {
      live: 'LIVE',
      partial: 'PARTIAL',
      recorded: 'RECORDED',
      connecting: 'SETTING OUT',
      none: 'none',
      unknown: 'unknown',
      https: 'HTTPS',
      plainHttp: 'not encrypted (local build)',
      channelLive: 'connected',
      channelDown: 'unavailable',
      channelWaiting: 'opening',
      expired: 'expired',
      security: 'Tenant scope in the application, and PostgreSQL row-level security, forced',
      engineerName: 'Kishan Thorat',
      drawnBy: 'the control plane, as it answers',
      checkedBy: 'PostgreSQL row-level security',
      recordedTenant: 'none — recorded set',
    },
    statusLine: {
      live: 'Your tenant is live. Actions below run against the real system.',
      partial:
        'Your tenant is live and every action is real. The live channel is unavailable, so ' +
        'revisions are read from the audit log over HTTP instead of arriving as they happen.',
      recorded: 'Recorded set. Exchanges captured from real runs; none of them are yours.',
      connecting: 'Setting out: reading the edge, then provisioning your tenant.',
    },
    setOut: {
      edge: 'Edge answered',
      edgeUnknown: 'Edge did not name a location',
      tenant: 'Tenant provisioned',
      tenantResumed: 'Tenant resumed',
      tenantFailed: 'Control plane did not answer',
      channel: 'Live channel connected',
      channelFailed: 'Live channel unavailable',
    },
    recordedFrom: 'Captured',
    recordedEnv: 'Environment',
    recordedTiming: 'Timings',
    retryLive: 'Try the live system again',
    revisionsEmpty: 'No revisions yet. A row appears only when the database writes one.',
    revisionsRecorded: 'As recorded',
    revisionsViaHttp: 'Read from the audit log over HTTP',
    otherActivity: 'events from other visitors this session (pseudonymous)',
    disclosure:
      'Demo plane. A physically separate system with no path to anything in production. ' +
      'Every tenant is destroyed on a timer by a worker on the server.',
    receipt: {
      action: 'Take the evidence',
      busy: 'Signing',
      note: 'A signed link to your session’s audit log. It keeps working after the purge.',
      recordedNote: 'Receipts are issued only for a live session.',
    },
    expiry: {
      ended:
        'This tenant reached the end of its time. The purge worker deletes it within seconds; ' +
        'the audit rows are kept.',
      restart: 'Start a new tenant',
    },
    misc: {
      skip: 'Skip to the sheet',
      recordedRoom: 'Recorded tenant',
      rev: 'Rev',
      time: 'UTC',
      action: 'Action',
      outcome: 'Outcome',
      earlier: 'earlier revisions not shown.',
      yourKey: 'requesting key',
      theirRecord: 'their record',
      readingPolicy: 'reading the policy from the database',
      notForced: 'Row-level security not forced',
      waitingAudit: 'Waiting for the database’s audit row.',
      viaSocket: 'pushed by the database trigger over the live channel',
      viaHttp: 'read from the audit log',
      viaRecorded: 'as recorded',
      disclosure: 'Disclosure',
      algorithm: 'Algorithm',
      decidedBy: 'Decided by',
      stored: 'Stored',
      why: 'Why',
      limit: 'Limit',
      fromFirstAnswer: 'read from the first answer',
      letteredFromFirst: 'lettered from the first answer',
      onFileAlready: 'on file already',
      replayed: 'replayed',
      limitsProof:
        'audit rows — one per accepted request. The shed requests never reached the handler, so they wrote none.',
      limitsProofRecorded: 'audit rows in the recording — one per accepted request.',
    },
    /* --- S16: recorded by design, CI-verified, and three investigations --- */
    opening: {
      headline: 'Recorded runs of a real multi-tenant system.',
      lede:
        'Five demonstrations replayed from exchanges the system really produced, and three ' +
        'investigations of defects it really had. No control plane is running behind this ' +
        'page, so nothing here is live, and nothing is attributed to you.',
      provenance: ['Recorded from the real system', 're-verified by CI on every push', 'source'],
      loaded: 'Recorded set loaded',
      captured: 'captured',
      statusLine: 'Recorded set. Exchanges captured from real runs; none of them are yours.',
    },
    source: {
      repo: 'https://github.com/KishanThorat111/engineering-portfolio',
      ci: 'https://github.com/KishanThorat111/engineering-portfolio/actions/workflows/ci.yml',
      repoLabel: 'Repository',
      ciLabel: 'Verifying workflow',
      verified: 'Verified',
      verifiedValue: 'Re-captured against real PostgreSQL and Redis by CI on every push',
      commitLabel: 'Commit',
    },
    sets: {
      a: 'Set A — Demonstrations',
      b: 'Set B — Investigations',
      investigation: 'Investigation',
    },
    incidentFields: {
      incident: 'Incident',
      occurred: 'Occurred',
      fixedIn: 'Fixed in',
      protection: 'Protection',
      historical: 'Historical incident',
      symptom: 'Symptom',
      evidence: 'Evidence',
      evidenceNote: 'In the order an engineer would inspect it.',
      investigation: 'Investigation',
      cause: 'Root cause',
      fix: 'Fix',
      guard: 'Protection',
      source: 'Source',
      inspect: 'Inspect',
      provedBy: 'Proved by',
    },
    incidents: {
      'b-201': {
        number: 'B-201',
        short: 'Live channel',
        name: '121 tests green; the live channel delivered nothing',
        title: 'Sequence — a socket that said hello, then nothing',
        when: '4–5 October 2026',
        context:
          'Found while building this page against the production-shaped stack. Fixed in the ' +
          'browser the same day, then at the source.',
        lanes: ['Browser', 'Gateway', 'Postgres · Redis'],
        lanesShort: ['Browser', 'Gateway', 'DB · Redis'],
        steps: [
          { from: 0, to: 1, kind: 'ok', label: 'socket opens' },
          { from: 0, to: 1, kind: 'lost', label: 'subscribe world' },
          { from: 0, to: 1, kind: 'lost', label: 'subscribe self' },
          { from: 1, to: 2, kind: 'ok', label: 'resolve credential · join presence' },
          { from: 1, to: 1, kind: 'self', label: 'message listener attached' },
          { from: 1, to: 0, kind: 'ok', label: 'hello' },
          { from: 1, to: 0, kind: 'ok', label: 'presence' },
        ],
        gap: { lane: 1, from: 1, to: 4, label: 'no listener' },
        drawingLabel:
          'Sequence: the browser opens the socket and sends two subscriptions; the gateway ' +
          'has no message listener until it has resolved the credential and joined ' +
          'presence, so both are lost; it then sends hello and presence, and no ' +
          'subscription is ever acknowledged.',
        symptom:
          'The socket opened and the server said hello. After that it delivered nothing: no ' +
          'events from other visitors, and not the visitor’s own audit rows. All 121 API ' +
          'tests passed.',
        evidence: [
          {
            title: 'The frames, traced in a real browser',
            kind: 'trace',
            source: { label: 'efbf654 and bb4fd82 — commit messages', commit: 'bb4fd82' },
            body:
              '> subscribe  world\n' +
              '> subscribe  self\n' +
              '< hello\n' +
              '< presence\n' +
              '  — no subscribed acknowledgement, and no events, ever',
          },
          {
            title: 'Where the gateway attached its listener',
            kind: 'code',
            source: {
              label: 'services/api/src/live/gateway.ts at efbf654, lines 180–218',
              path: 'services/api/src/live/gateway.ts',
              commit: 'efbf654',
              lines: 'L180-L218',
            },
            body:
              '180  const resolved = await resolveCredential(presentedKey);\n' +
              '198  await presence.join(subscriber.ephemeralId);\n' +
              "218  socket.on('message', (raw: Buffer) => {",
          },
          {
            title: 'Where the browser subscribed',
            kind: 'code',
            source: {
              label: 'apps/experience/src/live/source.ts before efbf654, lines 92–107',
              path: 'apps/experience/src/live/source.ts',
              commit: '643475f',
              lines: 'L92-L107',
            },
            body:
              '92   socket.onopen = () => {\n' +
              "104    socket.send(JSON.stringify({ type: 'subscribe', scope: 'world' }));\n" +
              "106    socket.send(JSON.stringify({ type: 'subscribe', scope: 'self' }));",
          },
          {
            title: 'Why 121 tests could not see it',
            kind: 'code',
            source: {
              label: 'services/api/test/integration/live-spine.test.js, lines 88–91',
              path: 'services/api/test/integration/live-spine.test.js',
              commit: 'efbf654',
              lines: 'L88-L91',
            },
            body:
              "90   await client.waitFor((m) => m.type === 'hello');\n" +
              "91   client.send({ type: 'subscribe', scope: 'self' });\n" +
              '     — every case waits for hello before it subscribes',
          },
        ],
        investigation: [
          'The socket opened and authenticated: hello named the tenant. Transport and auth worked.',
          'Traced the frames in a real browser: both subscriptions left before hello, and no acknowledgement came back.',
          'Read the gateway: its message listener is attached only after two awaits.',
          'Read the tests: every one waits for hello, so none of them ever sent a frame in the gap.',
        ],
        cause:
          'The gateway attached its message listener only after resolving the credential and ' +
          'joining presence. A frame that arrived in between had no listener, and was ' +
          'discarded without an error.',
        fix: [
          {
            commit: 'efbf654',
            date: '4 Oct 2026',
            summary: 'The browser subscribes on hello — the gateway’s own signal that it is ready.',
          },
          {
            commit: 'bb4fd82',
            date: '5 Oct 2026',
            summary:
              'The gateway attaches its listener first and queues early frames until the subscriber exists, then delivers them after hello.',
          },
        ],
        protection: {
          summary:
            'A test that sends both subscriptions the instant the socket opens, without waiting ' +
            'for hello, and must still receive both acknowledgements and its own audit row.',
          gate: 'live-spine.test.js — "B-201: subscriptions sent the instant the socket opens are queued, not dropped"',
          source: {
            path: 'services/api/test/integration/live-spine.test.js',
            commit: 'bb4fd82',
            lines: 'L179',
          },
          proof:
            'Run against the gateway before bb4fd82 it fails with the original symptom: “timed ' +
            'out waiting for the early world subscription. Received: ["hello","presence"]”. It ' +
            'runs in the API workflow, against real PostgreSQL and Redis.',
        },
      },
      'b-202': {
        number: 'B-202',
        short: 'Blank page',
        name: 'Production showed nothing; every check was green',
        title: 'Sequence — two policies, one intersection',
        when: '17–18 August 2026',
        context:
          'A historical incident on the earlier 3D surface, now preserved at /live/archive/. ' +
          'The current /live/ does not have it; the policy it receives is checked on every push.',
        lanes: ['Cloudflare', 'Browser', 'Control plane'],
        lanesShort: ['Edge', 'Browser', 'API'],
        steps: [
          { from: 0, to: 1, kind: 'ok', label: "CSP from /*  —  connect-src 'none'" },
          { from: 0, to: 1, kind: 'ok', label: "CSP from /live/*  —  connect-src 'self'" },
          { from: 1, to: 1, kind: 'self', label: 'enforces both: the intersection' },
          { from: 1, to: 2, kind: 'refused', label: 'POST /v1/tenants — blocked' },
          { from: 1, to: 1, kind: 'self', label: 'scene worker: importScripts(blob:) — blocked' },
        ],
        drawingLabel:
          'Sequence: Cloudflare sends the live page two security policies; the browser ' +
          'enforces their intersection, so its request to the control plane is blocked, and ' +
          'the 3D scene’s worker cannot load its code.',
        symptom:
          '17 August: /live/ loaded and could do nothing — provisioning failed, zero tenants, ' +
          'zero events, “Failed to fetch”. Every API path answered from curl, including a real ' +
          '201 from POST /v1/tenants. 18 August: the 3D scene shipped blank — WebGL fine, ' +
          'canvas sized, frame loop at 176 fps, not one pixel drawn.',
        evidence: [
          {
            title: 'The response headers /live/ actually received',
            kind: 'text',
            source: { label: '3cf7754 — commit message', commit: '3cf7754' },
            body:
              'Two Content-Security-Policy headers: the page’s own and the static one. All six ' +
              'shared headers arrived twice, and Strict-Transport-Security came back ' +
              'comma-joined with itself.',
          },
          {
            title: 'What a browser does with two policies',
            kind: 'text',
            source: { label: '3cf7754 — commit message', commit: '3cf7754' },
            body:
              'A browser enforces the INTERSECTION of every policy it is given. The static ' +
              "policy carried connect-src 'none', so it won, and nothing on the live surface " +
              'could open a connection.',
          },
          {
            title: 'The console, once connections worked',
            kind: 'trace',
            source: { label: '7b4cf85 — commit message', commit: '7b4cf85' },
            body:
              "NetworkError: Failed to execute 'importScripts' on 'WorkerGlobalScope'\n" +
              'worker module init function failed to rehydrate',
          },
          {
            title: 'Why the checks were green',
            kind: 'text',
            source: { label: '3cf7754 and 7b4cf85 — commit messages', commit: '7b4cf85' },
            body:
              'The browser harness applied headers with set, so a later rule replaced an earlier ' +
              'one: 35/35 green while production was broken. Frame sampling and canvas size both ' +
              'pass for a scene that draws nothing.',
          },
        ],
        investigation: [
          'Only the browser failed; curl succeeded. Only a browser enforces CSP.',
          'Read the response: two policies and a doubled HSTS meant Cloudflare was accumulating rules, not overriding them.',
          'Checked the installed wrangler rather than memory: UNSET_OPERATOR = "! ", and same-name values are comma-joined.',
          'For the blank scene: the text renderer’s worker imports a blob, which script-src did not allow, and one suspended child left the whole scene empty.',
        ],
        cause:
          'Cloudflare applies every matching _headers rule; a specific rule does not override a ' +
          'broad one. And the live policy’s script-src lacked blob:, which the text renderer’s ' +
          'worker needed to load its own code.',
        fix: [
          {
            commit: '3cf7754',
            date: '17 Aug 2026',
            summary:
              '/live/* unsets the inherited policy before setting its own; the harness now accumulates like Cloudflare.',
          },
          {
            commit: '7b4cf85',
            date: '18 Aug 2026',
            summary: 'blob: in script-src for /live/* only; the static surface never gains it.',
          },
        ],
        protection: {
          summary:
            'A CI gate that composes the built _headers exactly as Cloudflare does and asserts ' +
            'the policy each surface really receives: one policy, connect-src allowing its own ' +
            'API, blob: only where the scene needs it.',
          gate: 'npm run gate:policy — scripts/policy-check.mjs, in the CI workflow',
          source: { path: 'scripts/policy-check.mjs', commit: 'main' },
          proof:
            'On every run it re-applies both historical defects to a copy of the file and ' +
            'requires each to fail. Until S16 the only protection was a local browser harness ' +
            'that never ran in CI.',
        },
      },
      'b-203': {
        number: 'B-203',
        short: 'Deploy report',
        name: 'The deploy worked and reported failure',
        title: 'Sequence — a release script read by its own readiness check',
        when: '17 August 2026',
        context:
          'A historical incident in the control plane’s deploy workflow. No control plane is ' +
          'deployed today; the workflow and its guard remain, and are checked on every push.',
        lanes: ['Runner', 'bash -s on the VM', 'api container'],
        lanesShort: ['Runner', 'bash -s', 'api'],
        steps: [
          { from: 0, to: 1, kind: 'ok', label: 'release script, on stdin' },
          { from: 1, to: 2, kind: 'ok', label: 'compose pull · migrate · up -d' },
          { from: 1, to: 2, kind: 'ok', label: 'exec -T api — readiness check' },
          { from: 1, to: 2, kind: 'lost', label: 'the rest of the script, read as its stdin' },
          { from: 1, to: 1, kind: 'self', label: 'EOF — exit 0' },
          { from: 1, to: 0, kind: 'lost', label: 'completion marker never printed' },
        ],
        drawingLabel:
          'Sequence: the runner sends the release script to bash on stdin; the stack comes up; ' +
          'the readiness check inherits stdin and swallows the rest of the script; bash exits 0 ' +
          'and the completion marker never arrives, so the runner reports failure.',
        symptom:
          'Deploy API run #3 reported failure. It had pulled the image, run the migration and ' +
          'brought the whole stack up.',
        evidence: [
          {
            title: 'The deploy runs',
            kind: 'text',
            source: { label: 'Deploy API workflow runs', workflow: 'deploy-api.yml' },
            body:
              '#3  17 Aug 2026 04:35 UTC  18d174e  failure\n' +
              '#4  17 Aug 2026 09:12 UTC  3ed473e  success',
          },
          {
            title: 'How the script reaches the VM',
            kind: 'code',
            source: {
              label: '.github/workflows/deploy-api.yml at 3ed473e',
              path: '.github/workflows/deploy-api.yml',
              commit: '3ed473e',
              lines: 'L208-L312',
            },
            body:
              'gcloud compute ssh … --command "… bash -s" <<\'REMOTE\'\n' +
              '  …\n' +
              '  echo "__RELEASE_SCRIPT_COMPLETED__"\n' +
              'REMOTE\n' +
              "if ! grep -q '__RELEASE_SCRIPT_COMPLETED__' /tmp/release.log; then",
          },
          {
            title: 'The readiness check, before the fix',
            kind: 'code',
            source: {
              label: '.github/workflows/deploy-api.yml before 3ed473e, lines 275–276',
              path: '.github/workflows/deploy-api.yml',
              commit: '18d174e',
              lines: 'L275-L276',
            },
            body:
              'if sudo docker compose --env-file .env -f compose.yml exec -T api \\\n' +
              '     node -e "fetch(\'http://127.0.0.1:8080/health/ready\')…"; then',
          },
        ],
        investigation: [
          'The stack was up and healthy, so the failure was in the report, not the release.',
          'Reproduced against the same compose file and a real api container: without a redirect the marker never prints, and bash exits 0.',
          'Extracted the whole script from the workflow and piped it through bash -s in a sandbox.',
          'Audited every command in it: exec is the only one that reads stdin.',
        ],
        cause:
          'bash reads a script on stdin incrementally. docker compose exec -T inherits that same ' +
          'stdin and streamed every unexecuted line into the container, so bash reached EOF ' +
          'with nothing left to run and exited 0 before printing the marker.',
        fix: [
          {
            commit: '3ed473e',
            date: '17 Aug 2026',
            summary:
              'The readiness command reads < /dev/null; the error message now says what a missing marker really means.',
          },
        ],
        protection: {
          summary:
            'The completion-marker guard stays, and a CI check runs the committed release ' +
            'script under bash -s with docker stubbed — the exec stub reading stdin exactly as ' +
            'the real one does.',
          gate: 'npm run gate:release — scripts/release-check.mjs, in the CI workflow',
          source: { path: 'scripts/release-check.mjs', commit: 'main' },
          proof:
            'The marker must print. The negative control removes the redirect and requires the ' +
            'marker to be missing — exit 0 with no marker, the shape of run #3.',
        },
      },
    },
    notesHeading: 'Notes',
    evidenceHeading: 'Technical evidence',
    exchangesHeading: 'Exchanges',
    note: {
      you: 'You',
      request: 'The request',
      received: 'The system received',
      did: 'What it did',
      result: 'Result',
      why: 'Why',
      proof: 'Proof',
    },
    measuredLive: 'measured in this browser',
    measuredRecorded: 'recorded',
    pending: 'in flight',
    failure: 'The control plane stopped answering. Nothing was changed.',
    playRecorded: 'Play the recorded exchange instead',
    sheets: {
      isolation: {
        number: 'A-101',
        name: 'Isolation',
        title: 'Plan — your tenant and another',
        action: 'Try to read their record',
        actionRecorded: 'Play the recorded attempt',
        busy: 'Requesting',
        you: 'Asked for a record that belongs to another tenant, using your own key.',
        youRecorded:
          'A tenant asked for a record that belongs to another tenant, using its own key.',
        received: 'A read for one record, by its id, carrying your key.',
        did:
          'Took your tenant from the key, never from the request, and searched only inside your ' +
          'tenant. The database applied its own rule on top.',
        why: 'Two separate layers keep tenants apart. Either one alone would have refused this read.',
        yours: 'Your tenant',
        theirs: 'Another tenant',
        notYetCreated: 'created when you try',
        records: 'records',
        refused: 'Refused',
        boundary: 'Tenant boundary',
        policy: 'Policy',
        forced: 'Row-level security forced',
        layerScope: 'Layer 1 — application scope',
        layerRls: 'Layer 2 — PostgreSQL row-level security',
        attempted: 'The query your request ran',
        predicate: 'The rule, read live from pg_policies',
        plan: 'The query plan',
        branch: 'The line of code that answered',
        isolationFailure:
          'The read SUCCEEDED. That is an isolation failure and should be reported.',
      },
      limits: {
        number: 'A-102',
        name: 'Rate limits',
        title: 'Plan — twenty requests at one door',
        action: 'Send twenty requests',
        actionRecorded: 'Play the recorded twenty',
        busy: 'Sending',
        you: 'Sent twenty requests, one after another, as fast as the browser would.',
        youRecorded: 'A tenant sent twenty requests, one after another.',
        received: 'Twenty identical requests from one key.',
        did:
          'Counted them in Redis, per tenant. Past the limit it stopped running the handler and ' +
          'answered 429.',
        why:
          'A limit keyed to one tenant means one visitor cannot use up the capacity another ' +
          'visitor needs.',
        sign: 'Maximum',
        perWindow: 'per',
        keyed: 'keyed per',
        accepted: 'accepted',
        shed: 'shed',
        retry: 'Retry-After',
        total: 'twenty in',
      },
      payments: {
        number: 'A-103',
        name: 'Payments',
        title: 'Plan — two payments, one door',
        action: 'Send the same payment twice at once',
        actionRecorded: 'Play the recorded pair',
        busy: 'Sending both',
        you: 'Sent the same payment confirmation twice, at the same moment.',
        youRecorded: 'A tenant sent the same payment confirmation twice, at the same moment.',
        received: 'Two confirmations carrying one idempotency key, in flight together.',
        did:
          'Tried to insert both. A unique constraint let exactly one row in; the other became a ' +
          'replay of the first.',
        why:
          'Checking first and writing second leaves a gap where two requests both pass the check. ' +
          'The database rule has no gap.',
        door: 'One leaf',
        activations: 'Activations',
        oneRow: 'one row',
        replayed: 'replayed — no second row',
        activated: 'activated',
        schedule: 'Door schedule',
        key: 'Idempotency key',
        rows: 'Rows written',
        replays: 'Replays absorbed',
        statement: 'Decided by',
        redis: 'Redis',
      },
      fraud: {
        number: 'A-104',
        name: 'Duplicate evidence',
        title: 'Plan — the same photo, twice',
        action: 'Submit the same photo twice',
        actionRecorded: 'Play the recorded submissions',
        busy: 'Submitting',
        you: 'Submitted one photo as proof of a job, then the same photo for a different job.',
        youRecorded: 'A tenant submitted one photo, then the same photo for a different job.',
        received: 'Two uploads with identical bytes.',
        did:
          'Took a SHA-256 fingerprint of the bytes. The second fingerprint matched the first, and ' +
          'a unique rule refused it.',
        why:
          'Photo proof only counts if a photo cannot be reused. The photo itself is never stored ' +
          '— only its fingerprint.',
        register: 'Register',
        slot: 'Fingerprint on file',
        incoming: 'Second submission',
        accepted: 'accepted',
        duplicate: 'Duplicate',
        matches: 'identical fingerprint',
        digest: 'SHA-256',
        glyphNote: 'Each square is one bit of the fingerprint the server computed.',
      },
      ai: {
        number: 'A-105',
        name: 'AI routing',
        title: 'Plan — two routes for a question',
        operational: 'Ask: How many records do I have?',
        creative: 'Ask: Write a haiku about hospital logistics',
        actionRecorded: 'Play the recorded questions',
        busy: 'Asking',
        you: 'Asked a question.',
        youRecorded: 'A tenant asked two questions.',
        received: 'A question in plain words.',
        did:
          'Matched it against a fixed table of questions it can answer with one hand-written SQL ' +
          'statement. No match sends it toward the model, and charges your token budget.',
        why:
          'Questions the data can answer cost nothing. Only the rest spend money, and only up to ' +
          'a limit.',
        router: 'Router',
        dataPlane: 'Data plane — SQL',
        modelPlane: 'Model plane',
        free: '0 tokens',
        budget: 'Token budget',
        used: 'used',
        tokens: 'tokens',
        answer: 'Answer',
        sql: 'The statement that answered',
      },
    },
  },

  actions: {
    skipToDocument: 'Skip the scene and read the document',
    backToSite: 'Back to the main site',
    provision: 'Enter the system',
    retry: 'Try again',
  },
} as const;

export type Copy = typeof COPY;
