import type {Metadata} from 'next';
import {PlatformPage} from '@/app/platform/protected';
import AssistantView from './view';

export const dynamic='force-dynamic';
export const metadata:Metadata={title:'Assistant · AL-RIFA’I'};

export default function Page(){
  return <PlatformPage pathname="/assistant" label="Assistant" title="Assistant">
    <AssistantView/>
  </PlatformPage>;
}
