import type {Metadata} from 'next';
import {PlatformPage} from '@/app/platform/protected';
import InsightsView from './view';

export const dynamic='force-dynamic';
export const metadata:Metadata={title:'Operational Insights · AL-RIFA’I'};

export default function Page(){
  return <PlatformPage pathname="/insights" label="Operational Insights">
    <InsightsView/>
  </PlatformPage>;
}
