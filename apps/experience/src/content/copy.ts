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

  actions: {
    skipToDocument: 'Skip the scene and read the document',
    backToSite: 'Back to the main site',
    provision: 'Enter the system',
    retry: 'Try again',
  },
} as const;

export type Copy = typeof COPY;
