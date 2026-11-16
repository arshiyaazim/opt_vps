import type {Metadata} from 'next';
import {PlatformPage} from '@/app/platform/protected';
import DashboardView from './view';

export const dynamic='force-dynamic';
export const metadata:Metadata={title:'Dashboard · AL-RIFA’I'};

export default function DashboardPage(){
  return <PlatformPage pathname="/dashboard" label="Dashboard">
    <DashboardView/>
  </PlatformPage>;
}
