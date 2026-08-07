# apps/experience — the live experience surface

**Empty by design. Lands in Phase 4 (render layer), wired to live telemetry in Phase 5.**

This directory is not a placeholder waiting to be filled with something unspecified. It has a
specification (`docs/MASTER_IMPLEMENTATION_DOSSIER.md` §2, §3, §6.1) and a date, and it is
empty because the phase order puts the backend first — deliberately, so that the render layer
is built against data that already exists rather than data that is imagined.

## What lands here

A React 19 + TypeScript + Vite single-page application rendering the world described in
dossier §2 and §3: React Three Fiber for the scene, custom GLSL for the isolation membrane and
the volumetric light, GSAP for camera choreography and beat timing, Zustand for state.

## The constraint that shapes it

Every visual state must trace to a real backend event (dossier §1.3). A visual that could be
produced without the backend being real is decoration, and decoration is the one thing this
surface is not allowed to contain.

## Why it is not built yet

Phase order, from dossier §13: P1 control plane, P2 proof engine, P3 live spine, **P4 render
layer against fixtures**, P5 fusion. The fixtures P4 builds against are not throwaway — they
are the recorded real traces this surface replays when the live plane is unreachable
(dossier §6.3), so they stay honest by being user-visible.
