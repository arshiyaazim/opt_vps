import type {Metadata} from 'next';
import {PlatformPage} from '@/app/platform/protected';
import SubmissionsView from './view';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {title: 'My Submissions · AL-RIFA’I', robots: {index: false, follow: false}};

/** Available to every signed-in user; the API restricts the list to their own rows. */
export default function SubmissionsPage() {
  return <PlatformPage pathname="/submissions" label="My Submissions">
    <SubmissionsView/>
  </PlatformPage>;
}
