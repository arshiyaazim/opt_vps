import type {Metadata} from 'next';
import {PlatformPage} from '@/app/platform/protected';
import EmployeesView from './view';

export const dynamic='force-dynamic';
export const metadata:Metadata={title:'Employees · AL-RIFA’I'};

export default function Page(){
  return <PlatformPage pathname="/employees" label="Employees">
    <EmployeesView/>
  </PlatformPage>;
}
