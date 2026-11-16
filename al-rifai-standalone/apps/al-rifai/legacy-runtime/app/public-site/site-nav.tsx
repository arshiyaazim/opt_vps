'use client';
import {useEffect, useState} from 'react';
import Link from 'next/link';
import {Anchor, Menu, X} from 'lucide-react';

const LINKS = [
  {href: '#services', label: 'Services'},
  {href: '#about', label: 'About'},
  {href: '#contact', label: 'Contact'},
];

/**
 * Public site header. Desktop navigation plus a mobile drawer.
 * No business data, no session state: the public site never reads identity.
 */
export default function SiteNav() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    const prior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prior;
    };
  }, [open]);

  return (
    <>
      <a className="site-skip" href="#main">Skip to content</a>
      <header className="site-header">
        <div className="site-header-inner">
          <Link className="site-brand" href="/" aria-label="AL-RIFA’I Integrated Services home">
            <span className="site-mark" aria-hidden="true"><Anchor size={19} /></span>
            <span className="site-brand-text">
              <strong>AL-RIFA’I</strong>
              <span>Integrated Services</span>
            </span>
          </Link>
          <nav className="site-nav" aria-label="Primary">
            {LINKS.map((link) => <a key={link.href} href={link.href}>{link.label}</a>)}
          </nav>
          <div className="site-actions">
            <a className="site-btn site-btn-ghost" href="/login">Login</a>
            <a className="site-btn site-btn-primary" href="/signup">Sign Up</a>
          </div>
          <button
            type="button"
            className="site-burger"
            aria-label="Open menu"
            aria-expanded={open}
            aria-controls="site-drawer"
            onClick={() => setOpen(true)}
          >
            <Menu size={20} />
          </button>
        </div>
      </header>

      <div className="site-drawer" id="site-drawer" data-open={open ? 'true' : 'false'}>
        <div className="site-drawer-backdrop" onClick={() => setOpen(false)} />
        <div
          className="site-drawer-panel"
          role="dialog"
          aria-modal="true"
          aria-label="Site menu"
        >
          <div className="site-drawer-head">
            <span className="site-brand-text"><strong>AL-RIFA’I</strong><span>Integrated Services</span></span>
            <button type="button" className="site-burger" style={{display: 'inline-flex', marginLeft: 0}} aria-label="Close menu" onClick={() => setOpen(false)}>
              <X size={18} />
            </button>
          </div>
          {LINKS.map((link) => (
            <a key={link.href} href={link.href} onClick={() => setOpen(false)}>{link.label}</a>
          ))}
          <div className="site-drawer-actions">
            <a className="site-btn site-btn-ghost" href="/login" onClick={() => setOpen(false)}>Login</a>
            <a className="site-btn site-btn-primary" href="/signup" onClick={() => setOpen(false)}>Sign Up</a>
          </div>
        </div>
      </div>
    </>
  );
}
