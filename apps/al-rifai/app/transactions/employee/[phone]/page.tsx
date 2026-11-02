import type {Metadata} from 'next';
import {PlatformPage} from '@/app/platform/protected';
import EmployeeTransactionsView from './view';

export const dynamic='force-dynamic';
export const metadata:Metadata={title:'Employee transactions · AL-RIFA’I'};

/**
 * Per-employee Cash instruction history.
 *
 * Mirrors app/transactions/page.tsx: the route segment is a thin server wrapper
 * so the page keeps the authenticated AppShell and the same server-side guard as
 * every other platform route. All data work happens in the client view, which
 * reads the existing operations API and filters it locally — there is no new
 * endpoint and no server-side database access here.
 */
export default async function Page({params}:{params:Promise<{phone:string}>}){
  const {phone}=await params;
  return <PlatformPage
    pathname={`/transactions/employee/${encodeURIComponent(phone)}`}
    label="Employee transactions">
    <EmployeeTransactionsView phone={phone}/>
  </PlatformPage>;
}
