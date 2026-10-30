import type {Metadata} from 'next';
import {redirect} from 'next/navigation';
import {unifiedMode} from '@/lib/unified-auth';

export const metadata: Metadata = {
  title: 'AL-RIFA’I · Sign in',
  robots: {index: false, follow: false},
};

export const dynamic = 'force-dynamic';

export default function HomePage() {
  if (unifiedMode() !== 'off') redirect('/login');

  return (
    <main className="flex min-h-dvh items-center justify-center bg-muted/40 p-4">
      <section className="w-full max-w-sm rounded-lg border bg-background p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Sign-in is not enabled</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The unified sign-in service is not available in this environment. Contact the AL-RIFA’I operations desk.
        </p>
      </section>
    </main>
  );
}
