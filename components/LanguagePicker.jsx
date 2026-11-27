'use client';

import React, { useEffect, useRef, useState } from 'react';
import Icon from './Icon';
import { LANGUAGES } from '../lib/languages.mjs';

export default function LanguagePicker({ id, value, onChange, compact = false, disabled = false }) {
  const [open, setOpen] = useState(false);
  const wrapper = useRef(null);
  const trigger = useRef(null);
  const selected = value === 'unknown' ? (compact ? 'Auto detect' : 'Auto detect after your first message') : LANGUAGES[value] || value;
  const options = [['unknown', 'Auto detect after your first message'], ...Object.entries(LANGUAGES)];

  useEffect(() => {
    if (!open) return;
    const closeOutside = event => {
      if (!wrapper.current?.contains(event.target)) setOpen(false);
    };
    const closeOnEscape = event => {
      if (event.key === 'Escape') {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeOnEscape);
    const frame = requestAnimationFrame(() => wrapper.current?.querySelector('[aria-selected="true"]')?.focus());
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', closeOnEscape);
      cancelAnimationFrame(frame);
    };
  }, [open]);

  const select = code => {
    onChange(code);
    setOpen(false);
    requestAnimationFrame(() => trigger.current?.focus());
  };
  const move = event => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const buttons = [...(wrapper.current?.querySelectorAll('.language-option') || [])];
    if (!buttons.length) return;
    const index = buttons.indexOf(document.activeElement);
    const target = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1
      : event.key === 'ArrowDown' ? Math.min(index + 1, buttons.length - 1) : Math.max(index - 1, 0);
    buttons[target]?.focus();
  };

  return <div ref={wrapper} className={'language-picker' + (compact ? ' compact' : '')}>
    <button ref={trigger} id={id} type="button" className="language-picker-trigger" aria-haspopup="listbox" aria-controls={id + '-options'} aria-expanded={open} disabled={disabled} onClick={() => setOpen(current => !current)}>
      <span>{selected}</span><Icon name="chevron" size={18}/>
    </button>
    {open && <div id={id + '-options'} role="listbox" aria-label="Choose a conversation language" className="language-options" onKeyDown={move}>
      {options.map(([code, label]) => <button key={code} type="button" role="option" className="language-option" aria-selected={code === value} onClick={() => select(code)}>{label}</button>)}
    </div>}
  </div>;
}
