import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';
import './styles.css';
/*
 * The station stylesheets. These were imported only by the dev bench, so the
 * production route rendered every overlay as unstyled HTML — the exact
 * bench/production gap this integration exists to close, and a reminder that
 * "the bench works" proves nothing about the site.
 */
import './kit/kit.css';
import './scenes/enter.css';
import './scenes/systems.css';
import './scenes/dissection.css';
import './scenes/stations.css';

const container = document.getElementById('root');
if (!container) throw new Error('#root is missing from index.html');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
