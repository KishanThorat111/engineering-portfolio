/**
 * Loads and VALIDATES the recorded session.
 *
 * A JSON import is `any` shaped like hope. This checks it, because the
 * recording is the payload a visitor sees when the live plane is down (A5) — a
 * silently malformed fixture would mean the degraded mode degrades into
 * nothing, at exactly the moment the surface most needs to behave.
 *
 * It throws rather than falling back to something empty. An empty world with no
 * explanation is the failure §6.3 exists to prevent, and a build that shipped a
 * broken recording should be a loud problem rather than a quiet one.
 */
import type { LiveEvent } from '@contract';
import type { Recording } from './source.ts';
import raw from './recorded-session.json';

const OUTCOMES = new Set(['allowed', 'denied', 'error']);

function isLiveEvent(value: unknown): value is LiveEvent {
  if (typeof value !== 'object' || value === null) return false;
  const event = value as Record<string, unknown>;
  return (
    typeof event['id'] === 'string' &&
    typeof event['orgRef'] === 'string' &&
    typeof event['isSelf'] === 'boolean' &&
    typeof event['action'] === 'string' &&
    typeof event['outcome'] === 'string' &&
    OUTCOMES.has(event['outcome']) &&
    typeof event['occurredAt'] === 'string' &&
    typeof event['publishedAt'] === 'string' &&
    // The distinction the whole surface turns on: a duration is a real number
    // or it is null. Anything else means the recording cannot be trusted about
    // timing, and timing is what motion draws from.
    (event['durationMs'] === null || typeof event['durationMs'] === 'number')
  );
}

function parse(value: unknown): Recording {
  if (typeof value !== 'object' || value === null) {
    throw new Error('recorded-session.json is not an object');
  }
  const candidate = value as Record<string, unknown>;
  const events = candidate['events'];

  if (!Array.isArray(events) || events.length === 0) {
    throw new Error('recorded-session.json carries no events — degraded mode would show nothing');
  }

  const parsed = events.map((entry, index) => {
    if (typeof entry !== 'object' || entry === null) {
      throw new Error(`recorded-session.json entry ${index} is not an object`);
    }
    const row = entry as Record<string, unknown>;
    if (typeof row['offsetMs'] !== 'number') {
      throw new Error(`recorded-session.json entry ${index} has no numeric offsetMs`);
    }
    if (!isLiveEvent(row['event'])) {
      throw new Error(`recorded-session.json entry ${index} is not a valid LiveEvent`);
    }
    return { offsetMs: row['offsetMs'], event: row['event'] };
  });

  return {
    recordedAt: typeof candidate['recordedAt'] === 'string' ? candidate['recordedAt'] : 'unknown',
    source: typeof candidate['source'] === 'string' ? candidate['source'] : 'unknown',
    note: typeof candidate['note'] === 'string' ? candidate['note'] : '',
    events: parsed,
  };
}

export const RECORDING: Recording = parse(raw);
