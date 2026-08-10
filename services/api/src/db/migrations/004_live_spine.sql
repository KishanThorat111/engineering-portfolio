-- 004 — the live spine's source of events, and the real timing they carry.
--
-- P3 TRANSPORTS WHAT P2 ALREADY PRODUCES. That constraint decides the design
-- here, and it decides it in a way that is worth stating.
--
-- The obvious implementation is to publish from the application right after
-- writing the audit row. It is also wrong twice over. First, publishing inside
-- the transaction announces something that may still roll back — the exact bug
-- P1 hit when a 403 thrown inside `withTenant` erased the audit row it had just
-- written. Second, it creates a SECOND emitter: the row and the event become two
-- statements that can disagree, which is precisely the divergence rule 10
-- exists to prevent.
--
-- So the database is the emitter. An AFTER INSERT trigger on `audit_event`
-- calls pg_notify, and PostgreSQL delivers notifications ONLY on commit. An
-- event therefore cannot exist without a committed audit row, and a committed
-- audit row cannot fail to produce an event. Not by discipline — by mechanism.
--
-- It also removes the need for Redis pub/sub on this path: NOTIFY reaches every
-- listening session, so every API replica is notified without a second broker
-- in between. Redis still carries presence, which is genuinely shared mutable
-- state rather than a stream. Using Redis here instead would reintroduce the
-- possibility of an event with no row behind it.

-- ---------------------------------------------------------------------------
-- Real timing, because motion is measurement (§3.6).
--
-- The eventual render draws packet speed from latency, and that only stays
-- honest if the number is one the system actually measured. NULL when nothing
-- measured it — never 0, never an estimate. A missing measurement is a missing
-- measurement, and the render must show it as such rather than draw a fast
-- packet because the value defaulted.
-- ---------------------------------------------------------------------------
ALTER TABLE audit_event ADD COLUMN IF NOT EXISTS duration_ms integer
  CHECK (duration_ms IS NULL OR duration_ms >= 0);

COMMENT ON COLUMN audit_event.duration_ms IS
  'Real elapsed milliseconds from the start of the request to this audit write. '
  'NULL when unmeasured — never zero, never estimated.';

-- ---------------------------------------------------------------------------
-- The notification payload.
--
-- Deliberately small and deliberately incomplete. pg_notify caps a payload at
-- 8000 bytes, and `detail` is unbounded jsonb, so it is excluded: a subscriber
-- that wants the detail reads it back through /v1/audit, which is scoped by
-- RLS. Putting it in the broadcast would push tenant-owned content through a
-- channel every replica listens to, which is the wrong shape regardless of
-- whether it currently fits.
--
-- tenant_id IS included. The gateway needs it to decide what each subscriber
-- may see, and it replaces it with a per-subscriber pseudonym before anything
-- leaves the process — see src/live/pseudonym.ts.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION audit_event_notify() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  payload text;
BEGIN
  payload := json_build_object(
    'id',            NEW.id,
    'tenantId',      NEW.tenant_id,
    'action',        NEW.action,
    'outcome',       NEW.outcome,
    'resourceType',  NEW.resource_type,
    'occurredAt',    to_char(NEW.occurred_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MSZ'),
    'correlationId', NEW.correlation_id,
    'traceId',       NEW.trace_id,
    'durationMs',    NEW.duration_ms
  )::text;

  -- Guard rather than truncate. A payload over the limit would make NOTIFY
  -- raise and take the whole INSERT down with it — an audit write failing
  -- because its broadcast was too long would be a severe own goal. Dropping
  -- the broadcast is the lesser failure, and it is loud in the log.
  IF octet_length(payload) > 7000 THEN
    RAISE WARNING 'audit_event_notify: payload % bytes, skipping broadcast for %',
      octet_length(payload), NEW.id;
    RETURN NULL;
  END IF;

  PERFORM pg_notify('control_plane_events', payload);
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS audit_event_notify_trigger ON audit_event;
CREATE TRIGGER audit_event_notify_trigger
  AFTER INSERT ON audit_event
  FOR EACH ROW EXECUTE FUNCTION audit_event_notify();

-- The listener connects as demo_app and only LISTENs; no grant is needed for
-- LISTEN or for pg_notify. Recorded so nobody adds a privilege looking for one.
