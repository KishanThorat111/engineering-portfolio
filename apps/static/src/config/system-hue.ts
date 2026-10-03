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
