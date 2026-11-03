import type {Metadata} from 'next';
import {PlatformPage} from '@/app/platform/protected';
import ReviewQueueView from './view';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {title: 'Review Queue · AL-RIFA’I', robots: {index: false, follow: false}};

/**
 * Review Queue — admin only (RBAC-2B step 13).
 *
 * PlatformPage access='admin' is the gate: a USER who types the URL is redirected to
 * /dashboard before any queue data is fetched. Every action then re-checks the role
 * inside workflow_decide(), so the page is a convenience, not the security boundary.
 */
export default function ReviewPage() {
  return <PlatformPage pathname="/review" label="Review Queue" access="admin">
    <ReviewQueueView/>
  </PlatformPage>;
}
