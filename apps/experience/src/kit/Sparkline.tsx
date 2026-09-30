/**
 * SPARKLINE — Canvas 2D, because there are dozens of them.
 *
 * References 01, 02, 03, 05, 06 and 09 all put a small trend line next to a
 * figure. Reference 06 alone shows more than a dozen at once, redrawn on every
 * tick. That count is what decides the medium: as SVG each line is a path node
 * the browser must lay out and re-parse on every update, and at this density
 * that is the layout thrash the decomposition's medium law rules out. One
 * canvas per line, drawn imperatively, costs nothing.
 *
 * WHAT IT REFUSES TO DRAW
 * An empty series draws NOTHING — not a flat line at zero. A flat line is a
 * measurement of a system sitting still; an absent series is the absence of a
 * measurement, and they must not look the same. The panel says "not measured"
 * beside it, and the canvas stays blank.
 *
 * WHY IT TAKES A `samples` ARRAY AND NOT A LIVE SUBSCRIPTION
 * So the caller owns the honesty question. This component cannot invent a
 * point, smooth a gap, or extend a line to the right edge to make it look
 * full — it draws exactly the points it is handed, left to right.
 */
import { useEffect, useRef } from 'react';

export type SparklineProps = {
  /** Real measurements, oldest first. Empty draws nothing at all. */
  samples: number[];
  /** Line colour. Register hue when the series carries a state. */
  colour: string;
  width?: number;
  height?: number;
  /** Fill under the line, at low alpha. */
  fill?: boolean;
  /** Accessible description, since the canvas itself is not readable. */
  label: string;
};

export function Sparkline({
  samples,
  colour,
  width = 120,
  height = 28,
  fill = true,
  label,
}: SparklineProps) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    const dpr = Math.min(globalThis.devicePixelRatio || 1, 2);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, width, height);

    // Fewer than two points is not a trend. Draw nothing rather than a dot
    // that implies a line.
    if (samples.length < 2) return;

    let min = Infinity;
    let max = -Infinity;
    for (const value of samples) {
      if (!Number.isFinite(value)) continue;
      if (value < min) min = value;
      if (value > max) max = value;
    }
    if (!Number.isFinite(min) || !Number.isFinite(max)) return;

    // A perfectly flat series still deserves a line, drawn through the middle.
    const span = max - min || 1;
    const pad = 2;
    const usable = height - pad * 2;
    const step = width / (samples.length - 1);

    const pointAt = (i: number): [number, number] => {
      const value = samples[i] ?? min;
      return [i * step, pad + usable - ((value - min) / span) * usable];
    };

    if (fill) {
      context.beginPath();
      context.moveTo(0, height);
      for (let i = 0; i < samples.length; i += 1) {
        const [x, y] = pointAt(i);
        context.lineTo(x, y);
      }
      context.lineTo(width, height);
      context.closePath();
      const gradient = context.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, `${colour}38`);
      gradient.addColorStop(1, `${colour}00`);
      context.fillStyle = gradient;
      context.fill();
    }

    context.beginPath();
    for (let i = 0; i < samples.length; i += 1) {
      const [x, y] = pointAt(i);
      if (i === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.strokeStyle = colour;
    context.lineWidth = 1.25;
    context.lineJoin = 'round';
    context.lineCap = 'round';
    context.stroke();

    // The newest sample gets a dot, so the eye finds "now" without a legend.
    const [lastX, lastY] = pointAt(samples.length - 1);
    context.beginPath();
    context.arc(lastX - 1, lastY, 1.75, 0, Math.PI * 2);
    context.fillStyle = colour;
    context.fill();
  }, [samples, colour, width, height, fill]);

  return (
    <canvas
      ref={ref}
      className="sparkline"
      style={{ width: `${width}px`, height: `${height}px` }}
      role="img"
      aria-label={label}
    />
  );
}
