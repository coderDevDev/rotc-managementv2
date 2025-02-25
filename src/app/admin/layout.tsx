import type { Metadata } from 'next';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import AdminTemplate from './template';
import { Toaster } from 'sonner';

export const metadata: Metadata = {
  title: 'Admin Panel - ROTC Hub',
  description: 'Admin dashboard for ROTC Hub'
};

async function checkAdminAccess() {
  console.log('checkAdminAccess');
  const supabase = createServerComponentClient({ cookies });

  try {
    // Check if user is authenticated
    const {
      data: { session }
    } = await supabase.auth.getSession();

    console.log('Session:', session);

    if (!session) {
      console.log('No session found');
      return false;
    }

    // Check if user has admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    console.log('User profile:', profile);

    const hasAccess =
      profile?.role === 'cadet' ||
      profile?.role === 'rotc_coordinator' ||
      profile?.role === 'rotc_officer';

    console.log('Has access:', hasAccess);

    return hasAccess;
  } catch (error) {
    console.error('Error checking admin access:', error);
    return false;
  }
}

export default async function AdminLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const isAdmin = await checkAdminAccess();

  if (!isAdmin) {
    redirect('/login');
  }

  return (
    <>
      <AdminTemplate>{children}</AdminTemplate>
      <Toaster position="top-right" richColors />
    </>
  );
}
