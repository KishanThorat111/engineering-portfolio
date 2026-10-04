/**
 * The public /live/ — the working drawing (S15).
 *
 * The earlier ten-station world is not gone: its entry is src/archive.tsx,
 * served at /live/archive/ from the same build. This file and that one share
 * the data layer (live/, state/session.ts, content/copy.ts) and nothing else.
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './drawing/App.tsx';
import './drawing/drawing.css';

const container = document.getElementById('root');
if (!container) throw new Error('#root is missing from index.html');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
