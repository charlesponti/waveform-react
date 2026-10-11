import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { OrbExplainer } from '../src';

createRoot(document.getElementById('root')!).render(<StrictMode><OrbExplainer /></StrictMode>);
