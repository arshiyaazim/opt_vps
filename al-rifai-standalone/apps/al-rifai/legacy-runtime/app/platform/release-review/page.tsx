import type {Metadata} from 'next';
import {PlatformPage} from '@/app/platform/protected';
import ReleaseReviewView from './view';

export const dynamic='force-dynamic';
export const metadata:Metadata={title:'Release review · AL-RIFA’I'};

/** Admin review queue for release candidates parsed from the Release Slip group. */
export default function Page(){
  return <PlatformPage pathname="/platform/release-review" label="Release review" access="admin">
    <ReleaseReviewView/>
  </PlatformPage>;
}
