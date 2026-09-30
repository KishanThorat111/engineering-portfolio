/**
 * THE LABEL LAYER — every word in the references, as real HTML.
 *
 * The directive is explicit and this is how it is honoured: the words visible
 * in the reference images are design references, not image textures. Final text
 * is real HTML/UI so that spelling is exact, content is accessible, text is
 * responsive, animation is possible, and the content is sourced from the
 * repository rather than from an AI-generated picture of a website.
 *
 * WHAT THIS REPLACES
 * References 01–06 and 10 all use the same device: a short uppercase mono label
 * sitting in space beside an object, joined to it by a hairline leader rule. It
 * appears well over a hundred times across the set. It is one component pair,
 * and it is this one.
 *
 * WHY IT IS A PAIR AND NOT ONE COMPONENT
 * This was built as a single component first and it could not work, which is
 * worth recording because the failure is instructive. Projecting a world point
 * to the screen needs the camera, and the camera is only reachable through
 * hooks that must run INSIDE the R3F canvas — but a <div> inside the canvas is
 * handed to the three.js reconciler, which tries to construct it as a scene
 * object and throws "Svg is not part of the THREE namespace". DOM and scene
 * graph are two different reconcilers and a component cannot be in both.
 *
 * So the work is split along that seam:
 *   <LabelProjector>  lives inside the Canvas, reads the camera every frame,
 *                     writes screen positions onto already-mounted DOM nodes.
 *   <LabelOverlay>    lives outside the Canvas, renders the actual HTML and
 *                     registers its nodes with the shared projection.
 * They share one mutable object, created by `createLabelProjection()`.
 *
 * WHY NOT drei's <Html>
 * It mounts one absolutely-positioned DOM subtree per anchor and transforms
 * each every frame. Reference 03 has fourteen visible at once and 06 has more;
 * that is a layout-thrashing pattern at those counts. This writes positions as
 * CSS custom properties in one pass and lets the compositor place them — one
 * read of the camera, one write per label, no layout.
 *
 * ACCESSIBILITY IS THE POINT, NOT A CONCESSION
 * These labels are content — service names, layer names, region names, system
 * status. They are ordinary DOM in reading order, so a screen reader gets the
 * scene's structure as a list, and a visitor whose GPU cannot run WebGL still
 * gets every word. The leader lines are SVG and aria-hidden, because a line
 * joining a word to a box is decoration for anyone not looking at it.
 */
import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

export type LabelAnchor = {
  /** Stable identity, matching the object this labels. */
  id: string;
  /** World-space point the leader line points at. */
  at: [number, number, number];
  /** Short uppercase mono label. Real text, from repository content. */
  label: string;
  /** Optional second line — a role, a status, a measured value. */
  detail?: string;
  /** Which side the label sits on. The references use both. */
  side?: 'left' | 'right';
  /** Register hue for the status dot, when this anchor carries a state. */
  tone?: string;
};

/**
 * The seam between the two reconcilers. Mutable on purpose: it is written by a
 * frame loop and read by the DOM, and putting it in React state would re-render
 * the tree sixty times a second to move some text.
 */
export type LabelProjection = {
  anchors: LabelAnchor[];
  nodes: Map<string, HTMLElement>;
  maxDistance: number;
  /**
   * Reserved gutters, in CSS pixels, that the interface owns.
   *
   * Every reference station puts a display hero down one side and a panel
   * column down the other, and a projected world label that lands in either
   * one is drawn on top of body text. Anchor positions were being hand-nudged
   * per station to dodge them, which broke on every camera change and would
   * break again at any other viewport width.
   *
   * Declaring the gutters lets the projector solve it: a label whose preferred
   * side would put it into a gutter flips away from it, and one whose anchor is
   * inside a gutter is hidden rather than drawn over the copy.
   */
  gutterLeft: number;
  gutterRight: number;
};

export function createLabelProjection(): LabelProjection {
  return { anchors: [], nodes: new Map(), maxDistance: 140, gutterLeft: 0, gutterRight: 0 };
}

/* ------------------------------------------------------------------ *
 * Inside the Canvas. Touches no DOM structure — only style properties.
 * ------------------------------------------------------------------ */

const projected = new THREE.Vector3();

/**
 * Room a label needs beside its anchor before it is flipped to the other side.
 * Generous, because these carry a two-line label plus a leader rule.
 */
const EDGE_MARGIN = 430;

export function LabelProjector({ projection }: { projection: LabelProjection }) {
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);

  useFrame(() => {
    if (projection.nodes.size === 0) return;

    for (const anchor of projection.anchors) {
      const node = projection.nodes.get(anchor.id);
      if (!node) continue;

      projected.set(anchor.at[0], anchor.at[1], anchor.at[2]);
      const distance = projected.distanceTo(camera.position);
      projected.project(camera);

      /*
       * z > 1 is behind the camera. Both cases hide rather than clamp: a label
       * pinned to a screen edge for an object that is not on screen is worse
       * than no label, and it is how annotation layers turn into confetti.
       */
      const offscreen = projected.z > 1 || distance > projection.maxDistance;
      if (offscreen) {
        if (node.dataset['visible'] !== 'false') node.dataset['visible'] = 'false';
        continue;
      }

      const x = (projected.x * 0.5 + 0.5) * size.width;
      const y = (-projected.y * 0.5 + 0.5) * size.height;

      /*
       * Flip a label to the other side when its own side would run it off the
       * frame.
       *
       * This exists because reference 01's capability satellites sit far out
       * on +x, and hand-tuning their world positions to keep the HTML inside a
       * 1680px frame was whack-a-mole: every camera adjustment broke the
       * placement again, and a cropped label is worse than no label. Deciding
       * it here from the actual projected position fixes it for every scene
       * and every viewport at once, which is what a kit is for.
       *
       * The anchor's declared side is still the preference — this only
       * overrides when geometry and viewport leave no choice.
       */
      const leftBound = projection.gutterLeft;
      const rightBound = size.width - projection.gutterRight;

      /*
       * An anchor sitting inside a reserved gutter has nowhere legible to put
       * its label: whichever side it takes, the text lands on the interface.
       * Hidden is the honest outcome — the register card beside it already
       * names the object.
       */
      if (x < leftBound || x > rightBound) {
        if (node.dataset['visible'] !== 'false') node.dataset['visible'] = 'false';
        continue;
      }

      const preferred = anchor.side ?? 'right';
      const overflowsRight = preferred === 'right' && x > rightBound - EDGE_MARGIN;
      const overflowsLeft = preferred === 'left' && x < leftBound + EDGE_MARGIN;
      const side = overflowsRight ? 'left' : overflowsLeft ? 'right' : preferred;
      if (node.dataset['side'] !== side) node.dataset['side'] = side;

      node.style.setProperty('--x', `${x.toFixed(1)}px`);
      node.style.setProperty('--y', `${y.toFixed(1)}px`);
      // Distant labels recede rather than vanish, which is what gives the
      // reference frames their sense of depth in the annotation layer too.
      node.style.setProperty(
        '--depth',
        (1 - Math.min(distance / projection.maxDistance, 1)).toFixed(3),
      );
      if (node.dataset['visible'] !== 'true') node.dataset['visible'] = 'true';
    }
  });

  return null;
}

/* ------------------------------------------------------------------ *
 * Outside the Canvas. Ordinary HTML, in reading order.
 * ------------------------------------------------------------------ */

export type LabelOverlayProps = {
  projection: LabelProjection;
  anchors: LabelAnchor[];
  maxDistance?: number;
  /** CSS pixels the interface reserves on each side. See LabelProjection. */
  gutterLeft?: number;
  gutterRight?: number;
  onSelect?: (id: string) => void;
  activeId?: string | null;
  /** Names the group for assistive technology. */
  label?: string;
};

export function LabelOverlay({
  projection,
  anchors,
  maxDistance = 140,
  gutterLeft = 0,
  gutterRight = 0,
  onSelect,
  activeId = null,
  label = 'Scene annotations',
}: LabelOverlayProps) {
  const root = useRef<HTMLDivElement>(null);

  // Publish the anchors to the projector before it next runs.
  projection.anchors = anchors;
  projection.maxDistance = maxDistance;
  projection.gutterLeft = gutterLeft;
  projection.gutterRight = gutterRight;

  useEffect(() => {
    const container = root.current;
    if (!container) return;
    const nodes = projection.nodes;
    nodes.clear();
    container.querySelectorAll<HTMLElement>('[data-anchor]').forEach((node) => {
      const id = node.dataset['anchor'];
      if (id) nodes.set(id, node);
    });
    return () => nodes.clear();
  }, [anchors, projection]);

  return (
    <div className="label-layer" ref={root} role="list" aria-label={label}>
      {anchors.map((anchor) => (
        <div
          key={anchor.id}
          role="listitem"
          data-anchor={anchor.id}
          data-visible="false"
          data-side={anchor.side ?? 'right'}
          data-active={anchor.id === activeId ? 'true' : 'false'}
          className="label-layer__anchor"
        >
          <svg className="label-layer__leader" aria-hidden="true" focusable="false">
            <line x1="0" y1="0" x2="100%" y2="0" />
          </svg>
          {onSelect ? (
            <button type="button" className="label-layer__body" onClick={() => onSelect(anchor.id)}>
              <LabelBody anchor={anchor} />
            </button>
          ) : (
            <span className="label-layer__body">
              <LabelBody anchor={anchor} />
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function LabelBody({ anchor }: { anchor: LabelAnchor }) {
  return (
    <>
      <span className="label-layer__label">
        {anchor.tone ? (
          <span
            className="label-layer__dot"
            style={{ background: anchor.tone }}
            aria-hidden="true"
          />
        ) : null}
        {anchor.label}
      </span>
      {anchor.detail ? <span className="label-layer__detail">{anchor.detail}</span> : null}
    </>
  );
}
