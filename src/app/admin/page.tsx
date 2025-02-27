'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/config';
import { Users, Award, ClipboardCheck, Calendar } from 'lucide-react';

const stats = [
  {
    label: 'Total Cadets',
    value: '450',
    icon: Users,
    change: '+15%',
    description: 'Active ROTC cadets'
  },
  {
    label: 'Training Sessions',
    value: '24',
    icon: Calendar,
    change: '+2',
    description: 'Completed this semester'
  },
  {
    label: 'Attendance Rate',
    value: '92%',
    icon: ClipboardCheck,
    change: '+3%',
    description: 'Average attendance'
  },
  {
    label: 'Merit Awards',
    value: '45',
    icon: Award,
    change: '+12',
    description: 'Outstanding achievements'
  }
];

export default function AdminPage() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session }
      } = await supabase.auth.getSession();
      setLoading(false);
    };

    checkSession();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">ROTC Management Dashboard</h1>
      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* {stats.map(stat => (
          <div
            key={stat.label}
            className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  {stat.label}
                </p>
                <p className="mt-2 text-3xl font-semibold text-slate-900">
                  {stat.value}
                </p>
                <p
                  className={`mt-1 text-sm font-medium ${
                    stat.change.toString().startsWith('+')
                      ? 'text-emerald-600'
                      : 'text-red-600'
                  }`}>
                  {stat.change} from last period
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {stat.description}
                </p>
              </div>
              <div className="rounded-xl bg-primary/10 p-3 text-primary transition-transform group-hover:scale-110">
                <stat.icon size={24} />
              </div>
            </div>
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-primary/40 to-primary" />
          </div>
        ))} */}
      </div>

      {/* Recent Activity */}
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          Recent Activities
        </h2>
        <div className="mt-4 space-y-4">
          <div className="divide-y divide-gray-200">
            <div className="py-3">
              <p className="text-sm font-medium">Weekend Training Session</p>
              <p className="text-xs text-gray-500">
                Completed with 95% attendance
              </p>
            </div>
            <div className="py-3">
              <p className="text-sm font-medium">Merit Awards Ceremony</p>
              <p className="text-xs text-gray-500">
                15 cadets received recognition
              </p>
            </div>
            <div className="py-3">
              <p className="text-sm font-medium">Community Service Project</p>
              <p className="text-xs text-gray-500">
                Tree planting activity completed
              </p>
            </div>
            <div className="py-3">
              <p className="text-sm font-medium">Leadership Training</p>
              <p className="text-xs text-gray-500">
                New batch completed the course
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
