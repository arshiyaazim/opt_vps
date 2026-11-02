import type {Metadata} from 'next';
import {PlatformPage} from '@/app/platform/protected';
import EmployeeProgramsView from './view';

export const dynamic='force-dynamic';
export const metadata:Metadata={title:'Employee programs · AL-RIFA’I'};

/**
 * Per-employee vessel program history (B5.3b).
 *
 * Same shape as /transactions/employee/[phone]: a thin server wrapper so the page
 * keeps the authenticated AppShell and the server-side guard, with all data work
 * in the client view. Reads the existing register API filtered by escort mobile —
 * no new endpoint and no server-side database access here.
 */
export default async function Page({params}:{params:Promise<{phone:string}>}){
  const {phone}=await params;
  return <PlatformPage
    pathname={`/employee/${encodeURIComponent(phone)}/programs`}
    label="Employee programs">
    <EmployeeProgramsView phone={phone}/>
  </PlatformPage>;
}
