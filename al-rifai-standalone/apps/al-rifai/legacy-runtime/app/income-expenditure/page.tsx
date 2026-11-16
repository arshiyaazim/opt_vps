import type {Metadata} from 'next';
import {PlatformPage} from '@/app/platform/protected';
import IncomeExpenditureView from './view';

export const dynamic='force-dynamic';
export const metadata:Metadata={title:'Income & Expenditure · AL-RIFA’I'};

export default function Page(){
  return <PlatformPage pathname="/income-expenditure" label="Income & Expenditure">
    <IncomeExpenditureView/>
  </PlatformPage>;
}
