import type {Metadata} from 'next';
import {PlatformPage} from '@/app/platform/protected';
import ArchiveView from './view';

export const dynamic='force-dynamic';
export const metadata:Metadata={title:'Archive · AL-RIFA’I'};

export default function Page(){
  return <PlatformPage pathname="/archive" label="Archive">
    <ArchiveView/>
  </PlatformPage>;
}
