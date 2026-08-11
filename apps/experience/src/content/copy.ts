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

  actions: {
    skipToDocument: 'Skip the scene and read the document',
    backToSite: 'Back to the main site',
  },
} as const;

export type Copy = typeof COPY;
