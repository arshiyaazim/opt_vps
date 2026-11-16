import type {Metadata} from 'next';
import {redirect} from 'next/navigation';
import {PlatformPage} from '@/app/platform/protected';
import {getChatGPTUser} from '@/app/chatgpt-auth';
import AdminView from './view';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {title: 'Admin Panel · AL-RIFA’I', robots: {index: false, follow: false}};

/**
 * Admin Panel — gated by the verified Super Admin identity only.
 *
 * The gate is server-side and derives `superAdmin` from the stored user row plus
 * ALRIFAI_CASH_SUPER_ADMIN_IDS. A client cannot assert the role, and every
 * mutation re-checks policy inside the API route.
 */
export default async function AdminPage() {
  const user = await getChatGPTUser();
  if (!user) redirect('/login?next=%2Fadmin');
  if (user.superAdmin !== true || user.role !== 'ADMIN') redirect('/dashboard');
  return (
    <PlatformPage pathname="/admin" label="Admin Panel">
      <AdminView />
    </PlatformPage>
  );
}
