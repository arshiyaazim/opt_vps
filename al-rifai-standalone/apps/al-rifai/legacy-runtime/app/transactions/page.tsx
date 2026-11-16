import type {Metadata} from 'next';
import {PlatformPage} from '@/app/platform/protected';
import TransactionsView from './view';

export const dynamic='force-dynamic';
export const metadata:Metadata={title:'Transactions · AL-RIFA’I'};

export default function Page(){
  return <PlatformPage pathname="/transactions" label="Transactions"
    actions={<span data-actions="header-finance" className="flex items-center gap-1"><ImportCsvCsvNote/></span>}>
    <TransactionsView/>
  </PlatformPage>;
}

// Header-level actions are contextual and disabled where unsupported.
import {ActionButtonDisabled} from '@/app/platform/ui';
function ImportCsvCsvNote(){
  return <>
    <ActionButtonDisabled label="Import CSV" reason="Bulk import writes need an authorized backend and idempotency review."/>
    <ActionButtonDisabled label="Generate Report" reason="Report generation beyond CSV needs an approved renderer backend."/>
    <ActionButtonDisabled label="Reconcile" reason="Reconciliation decisions are Cash-portal, Owner-authorized operations."/>
  </>;
}
