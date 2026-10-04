/**
 * The drawing's state: what the system has actually said, and nothing else.
 *
 * MODE is derived, never chosen. LIVE needs a tenant the control plane really
 * provisioned AND a socket that really said hello. PARTIAL is a real tenant
 * with the channel down. RECORDED means the control plane did not answer, and
 * the page then shows only exchanges captured from real runs.
 */
import { create } from 'zustand';
import type { EdgeReading } from '../live/api.ts';

export type Mode = 'connecting' | 'live' | 'partial' | 'recorded';

export type Revision = {
  id: string;
  /** Session-local revision number, 1-based, in arrival order. */
  rev: number;
  at: string;
  action: string;
  outcome: 'allowed' | 'denied' | 'error';
  ms: number | null;
  via: 'socket' | 'http' | 'recorded';
};

export type Tenant = {
  publicRef: string;
  orgId: string;
  apiKey: string;
  expiresAt: string;
  records: number | null;
};

type State = {
  edge: EdgeReading | null;
  tenant: Tenant | null;
  /** `none`: no control plane is configured for this deployment — recorded by design. */
  tenantState: 'pending' | 'provisioned' | 'resumed' | 'failed' | 'none';
  tenantFailure: string | null;
  channel: 'waiting' | 'live' | 'down';
  presence: { connections: number; measured: boolean } | null;
  revisions: Revision[];
  otherEvents: number;
  announcement: string;
  setEdge: (edge: EdgeReading) => void;
  setTenant: (tenant: Tenant | null, state: State['tenantState'], failure?: string) => void;
  setChannel: (channel: State['channel']) => void;
  setPresence: (presence: State['presence']) => void;
  addRevision: (row: Omit<Revision, 'rev'>) => void;
  clearRevisions: () => void;
  countOther: () => void;
  announce: (text: string) => void;
};

export const useDrawing = create<State>((set) => ({
  edge: null,
  tenant: null,
  tenantState: 'pending',
  tenantFailure: null,
  channel: 'waiting',
  presence: null,
  revisions: [],
  otherEvents: 0,
  announcement: '',
  setEdge: (edge) => set({ edge }),
  setTenant: (tenant, tenantState, failure) =>
    set({ tenant, tenantState, tenantFailure: failure ?? null }),
  setChannel: (channel) => set({ channel }),
  setPresence: (presence) => set({ presence }),
  addRevision: (row) =>
    set((s) =>
      // One audit row, one revision, whichever path it arrived by.
      s.revisions.some((r) => r.id === row.id)
        ? s
        : { revisions: [...s.revisions, { ...row, rev: s.revisions.length + 1 }] },
    ),
  clearRevisions: () => set({ revisions: [] }),
  countOther: () => set((s) => ({ otherEvents: s.otherEvents + 1 })),
  announce: (announcement) => set({ announcement }),
}));

export function deriveMode(s: Pick<State, 'tenantState' | 'channel'>): Mode {
  if (s.tenantState === 'failed' || s.tenantState === 'none') return 'recorded';
  if (s.tenantState === 'pending') return 'connecting';
  if (s.channel === 'live') return 'live';
  if (s.channel === 'down') return 'partial';
  return 'connecting';
}

/**
 * Whether this deployment has a control plane to talk to (S16).
 *
 * Off unless the build sets VITE_LIVE_BACKEND=on, or a harness sets
 * globalThis.__LIVE_BACKEND__ = 'on' to point a production build at a local
 * stack. With it off, /live/ never provisions, never opens a socket, and
 * never waits on a control plane that is not there: RECORDED is the designed
 * state, not a failure. The whole LIVE path is kept, unchanged, behind it.
 */
export function backendConfigured(): boolean {
  const runtime = (globalThis as { __LIVE_BACKEND__?: string }).__LIVE_BACKEND__;
  return (runtime ?? (import.meta.env['VITE_LIVE_BACKEND'] as string | undefined)) === 'on';
}

export const useMode = (): Mode =>
  useDrawing((s) => deriveMode({ tenantState: s.tenantState, channel: s.channel }));
