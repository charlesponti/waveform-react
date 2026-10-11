import type { Transport } from './transport';

type Draw = (canvas: HTMLCanvasElement, t: number) => void;
interface Entry { canvas: HTMLCanvasElement; draw: Draw; transport: Transport; visible: boolean }

const entries = new Set<Entry>();
const byCanvas = new WeakMap<Element, Entry>();
let raf = 0;
let observer: IntersectionObserver | null = null;

function frame() {
  for (const e of entries) {
    if (!e.visible) continue;
    try { e.draw(e.canvas, e.transport.t()); } catch (err) { console.error(err); }
  }
  raf = entries.size ? requestAnimationFrame(frame) : 0;
}

/** Draws `canvas` every animation frame while it is on screen. One shared loop serves every canvas. Returns a cleanup. */
export function register(canvas: HTMLCanvasElement, draw: Draw, transport: Transport): () => void {
  observer ??= new IntersectionObserver(
    (list) => list.forEach((i) => { const e = byCanvas.get(i.target); if (e) e.visible = i.isIntersecting; }),
    { rootMargin: '120px' },
  );
  const entry: Entry = { canvas, draw, transport, visible: false };
  entries.add(entry);
  byCanvas.set(canvas, entry);
  observer.observe(canvas);
  if (!raf) raf = requestAnimationFrame(frame);
  return () => { entries.delete(entry); byCanvas.delete(canvas); observer?.unobserve(canvas); };
}
