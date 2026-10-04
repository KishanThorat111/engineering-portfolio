/**
 * The drawing's vocabulary: the few marks every sheet is made of.
 *
 * Every SVG here is laid out in CSS pixels at the width it is shown at, so a
 * 12px label is 12px on a phone and on a 2560px screen alike — a scaled
 * viewBox would shrink the lettering to nothing on a phone, and lettering is
 * half of what makes a drawing read as finished.
 *
 * Five motion verbs, and only these (styles in drawing.css): DRAFT — a line is
 * drawn; INK — pencil becomes ink; HATCH — a fill appears; STAMP — a mark
 * lands; REVISE — a revision cloud and a table row. Each is triggered by a
 * state the system reached, never by a timer of its own.
 */
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { COPY } from '../content/copy.ts';
import type { Outcome } from './demos.ts';

const D = COPY.drawing;

/** Width of the element, observed, so the drawing is laid out for its real size. */
export function useWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    setWidth(Math.round(el.getBoundingClientRect().width));
    const observer = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setWidth(Math.round(w));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, width];
}

/** A straight line, optionally drafted from its first point. */
export function Line({
  x1,
  y1,
  x2,
  y2,
  className = 'ln',
  draft = false,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  className?: string;
  draft?: boolean;
}) {
  return (
    <line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      pathLength={draft ? 1 : undefined}
      className={`${className}${draft ? ' draft' : ''}`}
    />
  );
}

/** A path, optionally drafted. */
export function Path({
  d,
  className = 'ln',
  draft = false,
}: {
  d: string;
  className?: string;
  draft?: boolean;
}) {
  return (
    <path
      d={d}
      pathLength={draft ? 1 : undefined}
      className={`${className}${draft ? ' draft' : ''}`}
    />
  );
}

/** Lettering: uppercase label, mono value or plain text. */
export function T({
  x,
  y,
  children,
  kind = 'label',
  anchor = 'start',
  className = '',
}: {
  x: number;
  y: number;
  children: ReactNode;
  kind?: 'label' | 'mono' | 'num' | 'title' | 'note';
  anchor?: 'start' | 'middle' | 'end';
  className?: string;
}) {
  return (
    <text x={x} y={y} textAnchor={anchor} className={`t-${kind} ${className}`.trim()}>
      {children}
    </text>
  );
}

/**
 * A dimension string: extension lines, a dimension line with architectural
 * ticks, and the measured value. Horizontal only — every sheet draws its
 * requests left to right, or top to bottom on a phone (`vertical`).
 */
export function Dimension({
  from,
  to,
  at,
  label,
  sub,
  vertical = false,
  className = '',
}: {
  from: number;
  to: number;
  /** y of the dimension line (x when vertical). */
  at: number;
  label: string;
  sub?: string;
  vertical?: boolean;
  className?: string;
}) {
  const tick = 5;
  if (vertical) {
    const mid = (from + to) / 2;
    return (
      <g className={`dim stamp ${className}`.trim()}>
        <Line x1={at} y1={from} x2={at} y2={to} className="ln ln--fine" />
        <Line x1={at - tick} y1={from + tick} x2={at + tick} y2={from - tick} className="ln" />
        <Line x1={at - tick} y1={to + tick} x2={at + tick} y2={to - tick} className="ln" />
        <T x={at - 10} y={mid} kind="num" anchor="end">
          {label}
        </T>
        {sub ? (
          <T x={at - 10} y={mid + 15} kind="note" anchor="end">
            {sub}
          </T>
        ) : null}
      </g>
    );
  }
  const mid = (from + to) / 2;
  return (
    <g className={`dim stamp ${className}`.trim()}>
      <Line x1={from} y1={at} x2={to} y2={at} className="ln ln--fine" />
      <Line x1={from - tick} y1={at + tick} x2={from + tick} y2={at - tick} className="ln" />
      <Line x1={to - tick} y1={at + tick} x2={to + tick} y2={at - tick} className="ln" />
      <T x={mid} y={at - 8} kind="num" anchor="middle">
        {label}
      </T>
      {sub ? (
        <T x={mid} y={at + 16} kind="note" anchor="middle">
          {sub}
        </T>
      ) : null}
    </g>
  );
}

/** A room: a rectangle in plan with its name and reference lettered inside. */
export function Room({
  x,
  y,
  w,
  h,
  name,
  reference,
  inked,
  hatched = false,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  name: string;
  reference: string | null;
  inked: boolean;
  hatched?: boolean;
}) {
  return (
    <g className={inked ? 'room room--ink' : 'room'}>
      {hatched ? <rect x={x} y={y} width={w} height={h} className="hatch-fill" /> : null}
      <rect x={x} y={y} width={w} height={h} className="ln ln--wall" />
      <T x={x + 14} y={y + 22}>
        {name}
      </T>
      <T x={x + 14} y={y + 40} kind="mono" className={reference ? '' : 't-pencil'}>
        {reference ?? '—'}
      </T>
    </g>
  );
}

/** A row of small squares, one per real record the tenant holds. */
export function RecordRow({
  x,
  y,
  count,
  size = 9,
  gap = 5,
}: {
  x: number;
  y: number;
  count: number;
  size?: number;
  gap?: number;
}) {
  return (
    <g className="records">
      {Array.from({ length: count }, (_, i) => (
        <rect key={i} x={x + i * (size + gap)} y={y} width={size} height={size} className="rec" />
      ))}
    </g>
  );
}

/** A revision cloud and its triangle — the REVISE verb. */
export function RevisionCloud({
  x,
  y,
  w,
  h,
  rev,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  rev: number;
}) {
  const r = 7;
  const pts: string[] = [];
  const edge = (x1: number, y1: number, x2: number, y2: number) => {
    const len = Math.hypot(x2 - x1, y2 - y1);
    const n = Math.max(2, Math.round(len / (r * 2)));
    for (let i = 1; i <= n; i += 1) {
      const px = x1 + ((x2 - x1) * i) / n;
      const py = y1 + ((y2 - y1) * i) / n;
      pts.push(`A ${r} ${r} 0 0 1 ${px.toFixed(1)} ${py.toFixed(1)}`);
    }
  };
  edge(x, y, x + w, y);
  edge(x + w, y, x + w, y + h);
  edge(x + w, y + h, x, y + h);
  edge(x, y + h, x, y);
  const tx = x + w + 6;
  const ty = y - 6;
  return (
    <g className="revise">
      <path d={`M ${x} ${y} ${pts.join(' ')}`} pathLength={1} className="ln ln--rev draft" />
      <path d={`M ${tx} ${ty} l 11 -19 l 11 19 z`} className="ln ln--rev rev-tri" />
      <T x={tx + 11} y={ty - 4} kind="num" anchor="middle" className="t-rev">
        {rev}
      </T>
    </g>
  );
}

/** A leader: a dot at the point, a line to the note. */
export function Leader({
  x1,
  y1,
  x2,
  y2,
  className = '',
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  className?: string;
}) {
  return (
    <g className={`leader stamp ${className}`.trim()}>
      <circle cx={x1} cy={y1} r={2.5} className="dot" />
      <path d={`M ${x1} ${y1} L ${x2} ${y2} L ${x2 + 18} ${y2}`} className="ln ln--fine" />
    </g>
  );
}

/** The 16 × 16 bit picture of a SHA-256 digest. Every square is a real bit. */
export function DigestGlyph({
  x,
  y,
  digest,
  size = 4,
  className = '',
}: {
  x: number;
  y: number;
  digest: string;
  size?: number;
  className?: string;
}) {
  const bits: boolean[] = [];
  for (const ch of digest.slice(0, 64)) {
    const v = Number.parseInt(ch, 16);
    for (let b = 3; b >= 0; b -= 1) bits.push(((v >> b) & 1) === 1);
  }
  return (
    <g className={`glyph stamp ${className}`.trim()}>
      <rect
        x={x - 3}
        y={y - 3}
        width={16 * size + 6}
        height={16 * size + 6}
        className="ln ln--fine glyph-frame"
      />
      {bits.map((on, i) =>
        on ? (
          <rect
            key={i}
            x={x + (i % 16) * size}
            y={y + Math.floor(i / 16) * size}
            width={size - 0.6}
            height={size - 0.6}
            className="bit"
          />
        ) : null,
      )}
    </g>
  );
}

/** "184 ms" — always with its precision, never rounded into something it was not. */
export const fmtMs = (ms: number) => `${ms < 10 ? ms.toFixed(1) : Math.round(ms)} ms`;

/** The caption under a measurement: where the number came from. */
export const measuredBy = (o: Outcome<unknown> | null) =>
  o?.source === 'recorded' ? D.measuredRecorded : D.measuredLive;

/** The plain-language notes, then the evidence — the two layers every sheet has. */
export function Notes({ items }: { items: Array<[string, ReactNode] | null> }) {
  return (
    <ol className="notes">
      {items.filter(Boolean).map((item, i) => {
        const [term, body] = item as [string, ReactNode];
        return (
          <li key={term} className="stamp">
            <span className="notes__n">{i + 1}</span>
            <span className="notes__term">{term}</span>
            <span className="notes__body">{body}</span>
          </li>
        );
      })}
    </ol>
  );
}

/** One request/response pair as a line of evidence. */
export function ExchangeLine({
  method,
  path,
  outcome,
}: {
  method: string;
  path: string;
  outcome: Outcome<unknown>;
}) {
  return (
    <li className="xline">
      <span className="xline__m">{method}</span>
      <span className="xline__p">{path}</span>
      <span className={`xline__s${outcome.status >= 400 ? ' xline__s--refused' : ''}`}>
        {outcome.status === 0 ? 'no answer' : outcome.status}
      </span>
      <span className="xline__t">
        {fmtMs(outcome.ms)} · {measuredBy(outcome)}
      </span>
    </li>
  );
}

export function Evidence({ children, open = false }: { children: ReactNode; open?: boolean }) {
  return (
    <details className="evidence" open={open}>
      <summary>{D.evidenceHeading}</summary>
      <div className="evidence__body">{children}</div>
    </details>
  );
}

/** Lets a sheet re-run its draft animations when a new run starts. */
export function useRunKey(): [number, () => void] {
  const [key, setKey] = useState(0);
  return [key, () => setKey((k) => k + 1)];
}

/** Announces a sentence to assistive technology once, when it changes. */
export function useAnnounce(text: string | null, announce: (t: string) => void) {
  useEffect(() => {
    if (text) announce(text);
  }, [text, announce]);
}
