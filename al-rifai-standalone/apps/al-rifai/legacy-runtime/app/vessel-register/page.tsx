import type {Metadata} from 'next';
import {PlatformPage} from '@/app/platform/protected';
import {getChatGPTUser} from '@/app/chatgpt-auth';
import VesselRegisterView from './view';

export const dynamic='force-dynamic';
export const metadata:Metadata={title:'Vessel Register · AL-RIFA’I'};

export default async function Page(){
  const user = await getChatGPTUser();
  const admin = !!user && (user.role === 'ADMIN' || user.source === 'validation' || user.superAdmin === true);
  return <PlatformPage pathname="/vessel-register" label="Vessel Register">
    <VesselRegisterView admin={admin}/>
  </PlatformPage>;
}
