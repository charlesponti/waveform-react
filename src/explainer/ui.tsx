import { Fragment, useId, type ReactNode } from 'react';

export function Part({ id, eyebrow, lead, title, first, children }: { id: string; eyebrow?: string; lead?: string; title: string; first?: boolean; children: ReactNode }) {
  return (
    <section className={first ? 'rvo-part rvo-first' : 'rvo-part'} id={id}>
      <span className="rvo-eyebrow">{lead ? <b>{lead}</b> : null}{lead && eyebrow ? ' / ' : ''}{eyebrow}</span>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

export const Cols = ({ even, children }: { even?: boolean; children: ReactNode }) => <div className={even ? 'rvo-cols rvo-even' : 'rvo-cols'}>{children}</div>;
export const Demo = ({ children }: { children: ReactNode }) => <div className="rvo-demo">{children}</div>;
export const Controls = ({ children, role, label }: { children: ReactNode; role?: string; label?: string }) => <div className="rvo-controls" role={role} aria-label={label}>{children}</div>;
export const Legend = ({ items }: { items: [string, string][] }) => (
  <div className="rvo-legend">{items.map(([color, text]) => <span key={text}><i style={{ background: color }} />{text}</span>)}</div>
);

export function Range({ label, value, onChange, min, max, step, format }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number; step: number; format?: (v: number) => string }) {
  const id = useId();
  return (
    <label htmlFor={id}>
      {label} <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value)} />
      <output>{format ? format(value) : value}</output>
    </label>
  );
}

export function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return <label><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} /> {label}</label>;
}

/** A formula block. Text between « and » is set small and dim, for notes. */
export function Eq({ children }: { children: string }) {
  const parts = children.split(/«|»/);
  return <div className="rvo-eq">{parts.map((p, i) => (i % 2 ? <small key={i}>{p}</small> : <Fragment key={i}>{p}</Fragment>))}</div>;
}

const KEYWORDS = /\b(let|var|func|static|for|in|while|true|return|if)\b/g;
/** A code block with just enough colouring: comments dim, keywords mint. */
export function Code({ children }: { children: string }) {
  const lines = children.split('\n');
  return (
    <pre className="rvo-code"><code>{lines.map((line, n) => {
      const i = line.indexOf('//');
      const code = i >= 0 ? line.slice(0, i) : line;
      const bits = code.split(KEYWORDS).map((s, j) => (j % 2 ? <span key={j} className="k">{s}</span> : s));
      return <Fragment key={n}>{bits}{i >= 0 ? <span className="c">{line.slice(i)}</span> : null}{n < lines.length - 1 ? '\n' : ''}</Fragment>;
    })}</code></pre>
  );
}

export const Readout = ({ r }: { r: React.RefObject<HTMLDivElement | null> }) => <div className="rvo-readout" ref={r} />;
