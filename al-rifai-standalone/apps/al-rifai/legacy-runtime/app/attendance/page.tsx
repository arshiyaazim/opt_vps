import type {Metadata} from 'next';
import {PlatformPage} from '@/app/platform/protected';
import {requireChatGPTUser} from '@/app/chatgpt-auth';
import AttendanceView from './view';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {title: 'Attendance · AL-RIFA’I', robots: {index: false, follow: false}};

/**
 * Attendance — available to every signed-in user.
 *
 * `admin` is resolved on the server and passed down as a presentation hint only; the
 * write routes re-derive the role from the session, so a tampered prop cannot turn a
 * staged entry into a live one.
 */
export default async function AttendancePage() {
  const user = await requireChatGPTUser('/attendance');
  const admin = user.role === 'ADMIN' || user.source === 'validation' || user.superAdmin === true;
  return <PlatformPage pathname="/attendance" label="Attendance">
    <AttendanceView admin={admin}/>
  </PlatformPage>;
}
