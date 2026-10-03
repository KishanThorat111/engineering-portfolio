/**
 * EACH SYSTEM'S COLOUR, ONE PLACE.
 *
 * On the home page each system's island is lit in its own hue — the hospital
 * blue, the menu ember, the electrical platform violet (StationJourney's
 * ISLAND table). The inner pages carry the same three systems, so they carry
 * the same three colours: a reader who met the ember island on `/` meets the
 * ember panel on `/systems`. These are brand-ramp stops — identity, never a
 * state; status is always carried by the status pill and its register colour.
 */
export const SYSTEM_HUE: Record<string, string> = {
  'hospital-operations': 'var(--hue-blue)',
  'menu-platform': 'var(--hue-ember)',
  'electrical-platform': 'var(--hue-violet)',
};

/**
 * Where each system's island sits on plate 02, as fractions across and down
 * the plate — measured off a 10% grid drawn over the master (Oct 2026). The
 * inner pages show each system by its island: the same picture a reader met
 * on the home page, enlarged to the one building that is this system.
 */
/**
 * The scene each case study opens on — the home page frame that is about what
 * that system is known for: the hospital platform's layered architecture
 * (03, the frame the home page dissects it in), the menu platform's request
 * and payment path (04), and the pre-launch platform's evidence archive (09),
 * because its tests and readiness audit are what it has to show.
 */
export const SYSTEM_SCENE: Record<
  string,
  { plate: 'dissection' | 'data' | 'proof'; focus: string; focusNarrow: string }
> = {
  'hospital-operations': { plate: 'dissection', focus: '56% 42%', focusNarrow: '56% 40%' },
  'menu-platform': { plate: 'data', focus: '60% 46%', focusNarrow: '62% 46%' },
  'electrical-platform': { plate: 'proof', focus: '52% 42%', focusNarrow: '52% 44%' },
};

export const SYSTEM_ISLAND: Record<string, { cx: number; cy: number }> = {
  'hospital-operations': { cx: 0.47, cy: 0.23 },
  'menu-platform': { cx: 0.745, cy: 0.25 },
  'electrical-platform': { cx: 0.75, cy: 0.61 },
};
