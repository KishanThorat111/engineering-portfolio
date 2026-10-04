/**
 * B-201…B-203 — an investigation, on the same sheet as a demonstration.
 *
 * Read in the order an engineer works: what was seen, the evidence in the
 * order it would be inspected, how it was narrowed down, the cause, the fix
 * as committed, the protection that now exists, and the source. Every item
 * cites the commit or file it comes from (content/copy.ts → incidents); none
 * is paraphrased into something the repository does not say.
 *
 * The drawing is a sequence diagram of the failure in the sheets' own
 * vocabulary: ink for what happened, a dashed line ending in an open circle
 * for a frame that was lost, a vermilion stop for a refusal, a hatched band
 * for the window the defect lived in. It is DOCUMENTED history, not a live
 * reading, so nothing in it moves.
 */
import { COPY } from '../../content/copy.ts';
import { Line, Path, T, useWidth } from '../parts.tsx';

const D = COPY.drawing;
const F = D.incidentFields;
const REPO = D.source.repo;

export type IncidentId = keyof typeof D.incidents;

type Step = { from: number; to: number; kind: string; label: string };
type Source = {
  label?: string;
  commit?: string;
  path?: string;
  lines?: string;
  workflow?: string;
};

export const commitUrl = (sha: string) => `${REPO}/commit/${sha}`;

function sourceUrl(s: Source): string {
  if (s.workflow) return `${REPO}/actions/workflows/${s.workflow}`;
  if (s.path) return `${REPO}/blob/${s.commit ?? 'main'}/${s.path}${s.lines ? `#${s.lines}` : ''}`;
  return commitUrl(s.commit ?? 'main');
}

export function IncidentSheet({ id }: { id: IncidentId }) {
  const c = D.incidents[id];
  const [ref, width] = useWidth<HTMLDivElement>();
  const gap = 'gap' in c ? c.gap : null;

  return (
    <article className="sheet-body incident" aria-labelledby="sheet-title">
      <p className="incident__context">
        <strong>
          {F.historical} · {c.when}.
        </strong>{' '}
        {c.context}
      </p>

      <div className="plan" ref={ref}>
        {width > 0 ? (
          <Sequence
            width={width}
            lanes={(width < 620 ? c.lanesShort : c.lanes) as readonly string[]}
            steps={c.steps as readonly Step[]}
            gap={gap}
            label={c.drawingLabel}
          />
        ) : null}
      </div>

      <ol className="notes incident__notes">
        <li>
          <span className="notes__n">1</span>
          <span className="notes__term">{F.symptom}</span>
          <span className="notes__body">{c.symptom}</span>
        </li>
      </ol>

      <section className="incident__block" aria-labelledby={`${id}-evidence`}>
        <h3 id={`${id}-evidence`} className="incident__h">
          <span className="notes__n">2</span> {F.evidence}
          <span className="incident__aside">{F.evidenceNote}</span>
        </h3>
        <ol className="ev-items">
          {c.evidence.map((e, i) => (
            <li key={e.title}>
              <details open={i === 0}>
                <summary>
                  <span className="ev-items__n">E{i + 1}</span>
                  <span className="ev-items__t">{e.title}</span>
                  <span className="ev-items__s">{e.source.label}</span>
                </summary>
                <div className="ev-items__body">
                  {e.kind === 'text' ? <p>{e.body}</p> : <pre>{e.body}</pre>}
                  <p className="ev-items__link">
                    <a href={sourceUrl(e.source as Source)}>{e.source.label}</a>
                  </p>
                </div>
              </details>
            </li>
          ))}
        </ol>
      </section>

      <section className="incident__block" aria-labelledby={`${id}-investigation`}>
        <h3 id={`${id}-investigation`} className="incident__h">
          <span className="notes__n">3</span> {F.investigation}
        </h3>
        <ol className="incident__steps">
          {c.investigation.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>

      <ol className="notes incident__notes" start={4}>
        <li>
          <span className="notes__n">4</span>
          <span className="notes__term">{F.cause}</span>
          <span className="notes__body">{c.cause}</span>
        </li>
        <li>
          <span className="notes__n">5</span>
          <span className="notes__term">{F.fix}</span>
          <span className="notes__body">
            <ul className="incident__fixes">
              {c.fix.map((f) => (
                <li key={f.commit}>
                  <a className="mono" href={commitUrl(f.commit)}>
                    {f.commit}
                  </a>{' '}
                  <span className="incident__date">{f.date}</span> — {f.summary}
                </li>
              ))}
            </ul>
          </span>
        </li>
        <li>
          <span className="notes__n">6</span>
          <span className="notes__term">{F.guard}</span>
          <span className="notes__body">
            {c.protection.summary}
            <span className="incident__gate">
              <a href={sourceUrl(c.protection.source as Source)}>{c.protection.gate}</a>
            </span>
            <span className="incident__proof">
              <strong>{F.provedBy}:</strong> {c.protection.proof}
            </span>
          </span>
        </li>
        <li>
          <span className="notes__n">7</span>
          <span className="notes__term">{F.source}</span>
          <span className="notes__body incident__sources">
            <a href={REPO}>{D.source.repoLabel}</a>
            {c.fix.map((f) => (
              <a key={f.commit} className="mono" href={commitUrl(f.commit)}>
                {f.commit}
              </a>
            ))}
            <a href={D.source.ci}>{D.source.ciLabel}</a>
          </span>
        </li>
      </ol>
    </article>
  );
}

/* --- the sequence ------------------------------------------------------- */

function Sequence({
  width,
  lanes,
  steps,
  gap,
  label,
}: {
  width: number;
  lanes: readonly string[];
  steps: readonly Step[];
  gap: { lane: number; from: number; to: number; label: string } | null;
  label: string;
}) {
  const compact = width < 620;
  const pad = compact ? 6 : 24;
  const top = 46;
  const row = compact ? 52 : 46;
  const height = top + steps.length * row + 18;
  const x = (i: number) => Math.round(pad + ((width - pad * 2) * (i + 0.5)) / lanes.length);
  const y = (i: number) => top + 22 + i * row;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={label}
    >
      {lanes.map((name, i) => (
        <g key={name}>
          <T x={x(i)} y={18} anchor="middle">
            {name}
          </T>
          <Line x1={x(i)} y1={30} x2={x(i)} y2={height - 6} className="ln ln--pencil" />
        </g>
      ))}

      {gap ? (
        <g className="seq-gap">
          <rect
            x={x(gap.lane) - 7}
            y={y(gap.from) - 16}
            width={14}
            height={y(gap.to) - y(gap.from) + 22}
            className="hatch-fill"
          />
          <rect
            x={x(gap.lane) - 7}
            y={y(gap.from) - 16}
            width={14}
            height={y(gap.to) - y(gap.from) + 22}
            className="ln ln--fine"
          />
          <T
            x={x(gap.lane) + 14}
            y={
              compact
                ? y(gap.from) + Math.round(row / 2) + 2
                : Math.round((y(gap.from) + y(gap.to)) / 2) + 4
            }
            kind="note"
            className="t-pencil"
          >
            {gap.label}
          </T>
        </g>
      ) : null}

      {steps.map((s, i) => {
        const yy = y(i);
        const x1 = x(s.from);
        const x2 = x(s.to);
        const dir = x2 >= x1 ? 1 : -1;
        const lx = compact ? pad : (x1 + x2) / 2;
        const anchor = compact ? 'start' : 'middle';
        const labelY = compact ? yy - 12 : yy - 8;

        if (s.kind === 'self') {
          return (
            <g key={i}>
              <circle cx={x1} cy={yy} r={3.5} className="dot" />
              <T
                x={x1 + (x1 > width * 0.6 ? -12 : 12)}
                y={yy + 4}
                kind="note"
                anchor={x1 > width * 0.6 ? 'end' : 'start'}
              >
                {s.label}
              </T>
            </g>
          );
        }
        if (s.kind === 'refused') {
          const stop = x1 + dir * 40;
          return (
            <g key={i}>
              <Line x1={x1} y1={yy} x2={stop} y2={yy} className="ln ln--req" />
              <Line x1={stop} y1={yy} x2={x2} y2={yy} className="ln ln--dash" />
              <Line x1={stop} y1={yy - 8} x2={stop} y2={yy + 8} className="ln ln--stop" />
              <T x={lx} y={labelY} kind="num" anchor={anchor} className="t-red">
                {s.label}
              </T>
            </g>
          );
        }
        if (s.kind === 'lost') {
          const end = x2 - dir * 6;
          return (
            <g key={i}>
              <Line x1={x1} y1={yy} x2={end} y2={yy} className="ln ln--dash" />
              <circle cx={end + dir * 2} cy={yy} r={4} className="seq-lost" />
              <T x={lx} y={labelY} kind="note" anchor={anchor} className="t-pencil">
                {s.label}
              </T>
            </g>
          );
        }
        return (
          <g key={i}>
            <Line x1={x1} y1={yy} x2={x2 - dir * 2} y2={yy} className="ln ln--req" />
            <Path
              d={`M ${x2 - dir * 9} ${yy - 4} L ${x2 - dir * 2} ${yy} L ${x2 - dir * 9} ${yy + 4}`}
              className="ln"
            />
            <T x={lx} y={labelY} kind="num" anchor={anchor}>
              {s.label}
            </T>
          </g>
        );
      })}
    </svg>
  );
}
