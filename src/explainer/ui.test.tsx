import { fireEvent, render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Check, Code, Cols, Controls, Demo, Eq, Legend, Part, Range, Readout } from './ui';

describe('Part', () => {
  it('shows a lead and an eyebrow with a slash between, and marks the first part', () => {
    const { container } = render(<Part id="a" lead="Part 2" eyebrow="maths" title="T" first><p>x</p></Part>);
    expect(container.querySelector('.rvo-eyebrow')?.textContent).toBe('Part 2 / maths');
    expect(container.querySelector('section')?.className).toBe('rvo-part rvo-first');
    expect(screen.getByRole('heading', { name: 'T' })).toBeTruthy();
  });
  it('copes with no lead, no eyebrow and not being first', () => {
    const { container } = render(<><Part id="b" title="B"><p>x</p></Part><Part id="c" lead="Only" title="C"><p>y</p></Part><Part id="d" eyebrow="only" title="D"><p>z</p></Part></>);
    const eyebrows = [...container.querySelectorAll('.rvo-eyebrow')].map((e) => e.textContent);
    expect(eyebrows).toEqual(['', 'Only', 'only']);
    expect(container.querySelector('section')?.className).toBe('rvo-part');
  });
});

describe('layout helpers', () => {
  it('Cols is one row, or two even columns', () => {
    const { container } = render(<><Cols><i /></Cols><Cols even><i /></Cols></>);
    expect([...container.children].map((c) => c.className)).toEqual(['rvo-cols', 'rvo-cols rvo-even']);
  });
  it('Demo, Controls and Legend render their content', () => {
    const { container } = render(<Demo><Controls role="group" label="L"><b>c</b></Controls><Controls><b>d</b></Controls><Legend items={[['red', 'one'], ['blue', 'two']]} /></Demo>);
    expect(screen.getByRole('group', { name: 'L' })).toBeTruthy();
    expect(container.querySelectorAll('.rvo-legend span')).toHaveLength(2);
  });
});

describe('Range and Check', () => {
  it('Range shows the value as given, or formatted, and reports changes as numbers', () => {
    const onChange = vi.fn();
    const { rerender } = render(<Range label="speed" value={3} onChange={onChange} min={0} max={10} step={1} />);
    expect(screen.getByRole('slider').parentElement?.querySelector('output')?.textContent).toBe('3');
    fireEvent.change(screen.getByRole('slider'), { target: { value: '7' } });
    expect(onChange).toHaveBeenCalledWith(7);
    rerender(<Range label="speed" value={3} onChange={onChange} min={0} max={10} step={1} format={(v) => `${v} s`} />);
    expect(screen.getByRole('slider').parentElement?.querySelector('output')?.textContent).toBe('3 s');
  });
  it('Check reports true and false', () => {
    const onChange = vi.fn();
    render(<Check label="on" checked={false} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText('on'));
    expect(onChange).toHaveBeenCalledWith(true);
  });
});

describe('Eq, Code, Readout', () => {
  it('Eq sets text between « » small', () => {
    const { container } = render(<Eq>{'a = b «note» c'}</Eq>);
    expect(container.querySelector('small')?.textContent).toBe('note');
    expect(container.textContent).toBe('a = b note c');
  });
  it('Code dims comments, colours keywords and keeps every line', () => {
    const { container } = render(<Code>{'let x = 1 // one\nreturn x\n\nplain'}</Code>);
    expect(container.querySelector('.c')?.textContent).toBe('// one');
    expect([...container.querySelectorAll('.k')].map((k) => k.textContent)).toEqual(['let', 'return']);
    expect(container.textContent).toBe('let x = 1 // one\nreturn x\n\nplain');
  });
  it('Readout renders an element for the ref', () => {
    const r = createRef<HTMLDivElement>();
    render(<Readout r={r} />);
    expect(r.current?.className).toBe('rvo-readout');
  });
});
