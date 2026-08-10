/**
 * Demonstration 3 — duplicate-photo detection.
 *
 * §2.6: "Upload the same photo twice. Watch the hash collide and the second
 * submission get rejected."
 *
 * The hospital platform's reasoning, which this reproduces: photo evidence of a
 * completed clean is only evidence if the same photo cannot be submitted for a
 * second job. The defence is a content hash with a uniqueness constraint, and
 * the constraint is what rejects — so two identical uploads racing produce the
 * same outcome as two in sequence.
 *
 * THE BYTES ARE NEVER STORED. This is a public upload endpoint on a demo plane
 * open to anyone; retaining visitor-supplied images would be a real liability
 * with no demonstrative value, since everything the demonstration shows comes
 * from the digest. What is kept is the SHA-256, the length, and a label.
 */
import { createHash } from 'node:crypto';
import type { Tx } from '../db/pool.js';

export type Submission = {
  id: string;
  image_sha256: string;
  label: string;
  byte_length: number;
  submitted_at: string;
  duplicate_attempts: number;
  last_duplicate_at: string | null;
};

export type SubmissionResult =
  | { outcome: 'accepted'; submission: Submission; digest: string }
  | { outcome: 'rejected-duplicate'; original: Submission; digest: string };

export function digestOf(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

/**
 * Submit evidence. The second identical submission is refused by the database.
 *
 * `ON CONFLICT DO NOTHING` rather than a read-then-write, for the same reason
 * as the payments station: the gap between checking and inserting is where the
 * duplicate gets through, and a uniqueness constraint has no gap.
 */
export async function submitEvidence(
  tx: Tx,
  orgId: string,
  input: { bytes: Buffer; label: string },
): Promise<SubmissionResult> {
  const digest = digestOf(input.bytes);

  const inserted = await tx.query<Submission>(
    `INSERT INTO fraud_submission (tenant_id, image_sha256, label, byte_length)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (tenant_id, image_sha256) DO NOTHING
     RETURNING id, image_sha256, label, byte_length, submitted_at,
               duplicate_attempts, last_duplicate_at`,
    [orgId, digest, input.label, input.bytes.byteLength],
  );

  if (inserted.rows.length === 1) {
    return { outcome: 'accepted', submission: inserted.rows[0] as Submission, digest };
  }

  // The collision is counted on the original, so the visitor can see how many
  // times the same image was re-presented and when.
  const bumped = await tx.query<Submission>(
    `UPDATE fraud_submission
        SET duplicate_attempts = duplicate_attempts + 1, last_duplicate_at = now()
      WHERE tenant_id = $1 AND image_sha256 = $2
      RETURNING id, image_sha256, label, byte_length, submitted_at,
                duplicate_attempts, last_duplicate_at`,
    [orgId, digest],
  );

  const original = bumped.rows[0];
  if (!original) throw new Error('submission vanished between conflict and duplicate update');
  return { outcome: 'rejected-duplicate', original, digest };
}

export async function listSubmissions(tx: Tx, orgId: string, limit: number): Promise<Submission[]> {
  const { rows } = await tx.query<Submission>(
    `SELECT id, image_sha256, label, byte_length, submitted_at,
            duplicate_attempts, last_duplicate_at
       FROM fraud_submission
      WHERE tenant_id = $1
      ORDER BY submitted_at DESC
      LIMIT $2`,
    [orgId, limit],
  );
  return rows;
}
