'use client';
import type {PayCell} from '@/lib/vessel-pay';

/**
 * Renders one derived pay value.
 *
 * A resolved amount shows plainly. A missing one shows a highlighted chip whose
 * tooltip explains why — the reason text is already operator-facing (see
 * lib/vessel-pay), never an internal code. Focusable so the explanation is not
 * hover-only.
 *
 * `plain` drops the chip styling and keeps only the explanation as a native
 * tooltip, for tables where the money columns must read as plain text.
 *
 * Shared by /vessel-register and /employee/[phone]/programs.
 */
export function PayValue({cell,plain=false}:{cell:PayCell;plain?:boolean}){
  if(!cell.note)return <span className="vr-pay">{cell.value}</span>;
  if(plain)return <span className="vr-pay" title={cell.note} aria-label={`${cell.value} — ${cell.note}`}>{cell.value}</span>;
  return <span className="vr-pay-missing" data-tip={cell.note} tabIndex={0} aria-label={`${cell.value} — ${cell.note}`}>{cell.value}</span>;
}
