'use client';

import {useState} from 'react';

type RequestState = 'idle' | 'submitting' | 'submitted';

const errors: Record<string, string> = {
  SIGNUP_FIELDS_INVALID: 'Enter your name and a valid email address.',
  SIGNUP_SCHEMA_REQUIRED: 'Request submission is not enabled yet. Please contact the AL-RIFA’I operations desk.',
  SIGNUP_PERMISSION_REQUIRED: 'Request submission is temporarily unavailable. Please contact the AL-RIFA’I operations desk.',
  ORIGIN_DENIED: 'This address is not allowed to submit the request.',
};

export default function SignupRequestForm() {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [state, setState] = useState<RequestState>('idle');
  const [error, setError] = useState('');

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setState('submitting');
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({displayName, email}),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : 'REQUEST_FAILED');
      setState('submitted');
    } catch (reason) {
      const code = reason instanceof Error ? reason.message : String(reason);
      setError(errors[code] || 'The request could not be submitted. Please try again later.');
      setState('idle');
    }
  }

  if (state === 'submitted') {
    return (
      <p role="status" className="site-callout" style={{marginTop: '1.25rem'}}>
        Your request has been received for review. This does not create an account or provide access to operational records.
      </p>
    );
  }

  return (
    <form className="mt-6 grid gap-4" onSubmit={submit}>
      <div className="grid gap-1.5">
        <label htmlFor="signup-name" className="text-sm font-medium">Name</label>
        <input
          id="signup-name"
          name="name"
          autoComplete="name"
          required
          minLength={2}
          maxLength={150}
          value={displayName}
          onChange={event => setDisplayName(event.target.value)}
          className="min-h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus-visible:ring-2 focus-visible:ring-sky-700"
        />
      </div>
      <div className="grid gap-1.5">
        <label htmlFor="signup-email" className="text-sm font-medium">Email</label>
        <input
          id="signup-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          maxLength={320}
          value={email}
          onChange={event => setEmail(event.target.value)}
          className="min-h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus-visible:ring-2 focus-visible:ring-sky-700"
        />
      </div>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <button
        className="site-btn site-btn-primary justify-center disabled:cursor-not-allowed disabled:opacity-60"
        type="submit"
        disabled={state === 'submitting'}
      >
        {state === 'submitting' ? 'Submitting…' : 'Submit request'}
      </button>
    </form>
  );
}
