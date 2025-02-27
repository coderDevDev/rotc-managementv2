'use client';

import { cn } from '@/lib/utils';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import {
  RiDashboardLine,
  RiSettings4Line,
  RiUser3Line,
  RiLogoutBoxLine
} from 'react-icons/ri';
import {
  MdInventory2,
  MdOutlineProductionQuantityLimits,
  MdOutlineAssignment
} from 'react-icons/md';
import { FiMenu } from 'react-icons/fi';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { toast } from 'sonner';
import { Group, ListOrderedIcon } from 'lucide-react';
import {
  ClipboardCheck as ClipboardCheckIcon,
  Trophy as TrophyIcon,
  Megaphone as MegaphoneIcon,
  Users as UsersIcon,
  Building2
} from 'lucide-react';

const adminLinks = [
  {
    label: 'Dashboard',
    href: '/admin',
    icon: RiDashboardLine
  },
  {
    label: 'Students',
    href: '/admin/students',
    icon: RiUser3Line,
    description: 'Enrolled ROTC cadets'
  },
  {
    label: 'Enrollment',
    href: '/admin/enrollment',
    icon: MdOutlineAssignment,
    description: 'ROTC inquiries and applications'
  },
  {
    label: 'Battalion',
    href: '/admin/battalions',
    icon: Building2,
    description: 'Battalion information'
  },
  {
    label: 'Attendance',
    href: '/admin/attendance',
    icon: ClipboardCheckIcon,
    description: 'Training attendance records'
  },
  {
    label: 'Grades and Rankings',
    href: '/admin/grades',
    icon: TrophyIcon,
    description: 'Cadet evaluations and rankings'
  },
  {
    label: 'Announcements',
    href: '/admin/announcements',
    icon: MegaphoneIcon,
    description: 'Manage ROTC announcements'
  }
];

const cadetLinks = [
  {
    label: 'Announcements',
    href: '/admin/announcements',
    icon: MegaphoneIcon
  },
  {
    label: 'Enrollment',
    href: '/admin/enrollment',
    icon: MdOutlineAssignment,
    description: 'ROTC inquiries and applications'
  },
  {
    label: 'Attendance',
    href: '/admin/attendance',
    icon: ClipboardCheckIcon,
    description: 'Training attendance records'
  },
  {
    label: 'Grades and Rankings',
    href: '/admin/grades',
    icon: TrophyIcon,
    description: 'Cadet evaluations and rankings'
  }
];

export default function AdminTemplate({
  children
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const pathname = usePathname();
  const supabase = createClientComponentClient();
  const [role, setRole] = useState<string | null>(null);
  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const {
          data: { session }
        } = await supabase.auth.getSession();

        if (!session) {
          throw new Error('No session found');
        }

        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();

        if (error) {
          throw error;
        }

        console.log({ jhaaamsss: profile.role });

        setRole(profile.role);
      } catch (error) {
        console.error('Error fetching user role:', error);
        toast.error('Failed to fetch user role');
      }
    };

    fetchUserRole();
  }, [supabase]);

  const handleLogout = async () => {
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      window.location.href = '/login';
    } catch (error) {
      console.error('Error logging out:', error);
      toast.error('Failed to log out');
    } finally {
      setIsLoading(false);
    }
  };

  const links = role === 'rotc_coordinator' ? adminLinks : cadetLinks;
  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-full bg-white transition-all duration-300',
          isSidebarOpen ? 'w-64' : 'w-20'
        )}>
        <div className="flex h-full flex-col border-r border-slate-100">
          <span className="p-2 ml-50 text-xl font-semibold text-slate-900 text-center">
            ROTC Admin
          </span>
          {/* Sidebar Links */}
          <div className="flex-1 overflow-y-auto p-4">
            <nav className="space-y-2">
              {links.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'flex items-center space-x-3 rounded-xl px-4 py-2.5 transition-colors',
                    pathname === link.href
                      ? 'bg-primary/10 text-primary'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  )}>
                  <link.icon size={20} />
                  {isSidebarOpen && <span>{link.label}</span>}
                </Link>
              ))}
            </nav>
          </div>

          {/* User Info and Logout */}
          <div className="border-t border-slate-100 p-4">
            {/* <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-full bg-primary/10" />
              {isSidebarOpen && (
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">
                    Admin User
                  </p>
                  <p className="text-xs text-slate-500">admin@example.com</p>
                </div>
              )}
            </div> */}
            <button
              onClick={handleLogout}
              disabled={isLoading}
              className={cn(
                'mt-4 flex w-full items-center space-x-3 rounded-xl px-4 py-2.5 text-slate-600 transition-colors',
                'hover:bg-red-50 hover:text-red-600',
                isLoading && 'opacity-50 cursor-not-allowed'
              )}>
              <RiLogoutBoxLine size={20} />
              {isSidebarOpen && (
                <span>{isLoading ? 'Logging out...' : 'Logout'}</span>
              )}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main
        className={cn(
          'flex-1 overflow-x-hidden transition-all duration-300',
          isSidebarOpen ? 'ml-40' : 'ml-20'
        )}>
        <div className="px-5 py-4">{children}</div>
      </main>
    </div>
  );
}
