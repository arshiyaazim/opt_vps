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
 * Shared by /vessel-register and /employee/[phone]/programs so both tables render
 * identically.
 */
export function PayValue({cell}:{cell:PayCell}){
  if(!cell.note)return <span className="vr-pay">{cell.value}</span>;
  return <span className="vr-pay-missing" data-tip={cell.note} tabIndex={0} aria-label={`${cell.value} — ${cell.note}`}>{cell.value}</span>;
}
