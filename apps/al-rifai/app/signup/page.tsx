import type {Metadata} from 'next';
import Link from 'next/link';
import {ArrowLeft, ShieldCheck} from 'lucide-react';
import SiteNav from '../public-site/site-nav';
import SignupRequestForm from './request-form';
import '../public-site.css';

export const metadata: Metadata = {
  title: 'Request access · AL-RIFA’I Integrated Services',
  description: 'Account access for AL-RIFA’I clients is provisioned after verification. Signing up never grants access to operational data.',
  robots: {index: true, follow: true},
};

const STEPS = [
  {
    title: 'Submit your name and email',
    body: 'The request is stored for review; no password or business data is collected on this page.',
  },
  {
    title: 'An authorised administrator reviews the request',
    body: 'A decision is recorded against the request. Approval does not itself create an active account.',
  },
  {
    title: 'Account setup follows approval',
    body: 'If approved, an administrator creates the account through the existing account-management workflow.',
  },
  {
    title: 'Scoped access only',
    body: 'Each account sees only the functions it has been granted. Financial posting and approval remain separate, restricted actions.',
  },
];

export default function SignUpPage() {
  return (
    <div className="site">
      <SiteNav />
      <main id="main" className="site-main">
        <div className="site-page">
          <Link href="/" style={{display: 'inline-flex', alignItems: 'center', gap: '.4rem', fontSize: '.85rem', color: 'var(--site-ink-soft)'}}>
            <ArrowLeft size={14} /> Back to home
          </Link>
          <section className="site-panel" style={{marginTop: '1.25rem'}}>
            <span className="site-eyebrow">Request access</span>
            <h1>Request an account</h1>
            <p className="site-lead">
              Submit a request for an administrator to review. This form does not create an account
              and does not grant access to operational data.
            </p>
            <ol className="site-steps">
              {STEPS.map((step) => (
                <li key={step.title}>
                  <div>
                    <strong>{step.title}</strong>
                    <span>{step.body}</span>
                  </div>
                </li>
              ))}
            </ol>
            <SignupRequestForm />
            <p className="site-callout">
              <ShieldCheck size={15} style={{verticalAlign: '-2px', marginRight: '.35rem'}} />
              Signing up never grants access to client, personnel or financial records. Access is
              issued by an authorised administrator and limited to the permissions assigned to that
              account.
            </p>
            <div className="site-hero-actions" style={{marginTop: '1.5rem'}}>
              <a className="site-btn site-btn-primary" href="/login">I already have an account</a>
              <Link className="site-btn site-btn-ghost" href="/">Back to home</Link>
            </div>
          </section>
        </div>
      </main>
      <footer className="site-footer">
        <div className="site-footer-bottom">
          <span>© {new Date().getFullYear()} AL-RIFA’I Integrated Services. All rights reserved.</span>
          <span><Link href="/login">Login</Link> · <Link href="/">Home</Link></span>
        </div>
      </footer>
    </div>
  );
}
