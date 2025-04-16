'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Users,
  Medal,
  Building2,
  TrendingUp,
  Activity,
  Calendar,
  Award,
  UserCheck
} from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';

interface DashboardStats {
  totalCadets: number;
  totalBattalions: number;
  activeOfficers: number;
  averagePerformance: number;
  recentUpdates: number;
  topPerformers: number;
  enrollmentTrend: {
    month: string;
    cadets: number;
  }[];
  performanceByBattalion: {
    name: string;
    average: number;
    passing: number;
  }[];
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [officerBattalionId, setOfficerBattalionId] = useState<string | null>(
    null
  );
  const router = useRouter();
  const supabase = createClientComponentClient();

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        setLoading(true);

        // Get user session and role
        const {
          data: { session }
        } = await supabase.auth.getSession();
        if (!session) {
          router.push('/login');
          return;
        }

        // Get user role
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, id')
          .eq('id', session.user.id)
          .single();

        setUserRole(profile?.role);

        // If ROTC officer, get their battalion
        if (profile?.role === 'rotc_officer') {
          const { data: battalionData } = await supabase
            .from('battalions')
            .select('id, name')
            .eq('commander_id', profile.id)
            .single();

          setOfficerBattalionId(battalionData?.id);
        }

        // Fetch stats based on role
        if (profile?.role === 'cadet') {
          // Cadet view - show personal stats
          const { data: cadetGrades } = await supabase
            .from('term_grades')
            .select('*')
            .eq('user_id', session.user.id);

          const averageScore = cadetGrades?.length
            ? cadetGrades.reduce((sum, grade) => sum + (grade.score || 0), 0) /
              cadetGrades.length
            : 0;

          setStats({
            totalCadets: 1,
            totalBattalions: 1,
            activeOfficers: 0,
            averagePerformance: averageScore,
            recentUpdates:
              cadetGrades?.filter(
                g =>
                  new Date(g.updated_at) >
                  new Date(Date.now() - 24 * 60 * 60 * 1000)
              ).length || 0,
            topPerformers: cadetGrades?.filter(g => g.score >= 90).length || 0,
            enrollmentTrend: [], // Not relevant for cadets
            performanceByBattalion: [] // Not relevant for cadets
          });
        } else if (profile?.role === 'rotc_officer') {
          // ROTC Officer view - show battalion stats
          const { data: grades } = await supabase
            .from('term_grades')
            .select(
              `
              *,
              profiles!inner (
                battalion_members!inner (
                  battalion_id
                )
              )
            `
            )
            .eq('profiles.battalion_members.battalion_id', officerBattalionId);

          const battalionCadets = new Set(grades?.map(g => g.user_id)).size;
          const averagePerformance = grades?.length
            ? grades.reduce((sum, grade) => sum + (grade.score || 0), 0) /
              grades.length
            : 0;

          setStats({
            totalCadets: battalionCadets,
            totalBattalions: 1,
            activeOfficers: 1,
            averagePerformance,
            recentUpdates:
              grades?.filter(
                g =>
                  new Date(g.updated_at) >
                  new Date(Date.now() - 24 * 60 * 60 * 1000)
              ).length || 0,
            topPerformers: grades?.filter(g => g.score >= 90).length || 0,
            enrollmentTrend: [], // Could show battalion enrollment trend
            performanceByBattalion: [] // Not relevant for single battalion
          });
        } else {
          // Coordinator view - show all stats
          // Fetch total cadets
          const { count: totalCadets } = await supabase
            .from('profiles')
            .select('*', { count: 'exact' })
            .eq('role', 'cadet');

          // Fetch total battalions
          const { count: totalBattalions } = await supabase
            .from('battalions')
            .select('*', { count: 'exact' });

          // Fetch active officers
          const { count: activeOfficers } = await supabase
            .from('profiles')
            .select('*', { count: 'exact' })
            .eq('role', 'rotc_officer');

          // Fetch grades for performance metrics
          const { data: grades } = await supabase.from('term_grades').select(`
              *,
              battalions!inner (
                name
              )
            `);

          // Calculate average performance
          const averagePerformance = grades
            ? grades.reduce((sum, grade) => sum + (grade.score || 0), 0) /
              grades.length
            : 0;

          // Count recent updates (last 24 hours)
          const recentUpdates = grades
            ? grades.filter(
                g =>
                  new Date(g.updated_at) >
                  new Date(Date.now() - 24 * 60 * 60 * 1000)
              ).length
            : 0;

          // Count top performers (score >= 90)
          const topPerformers = grades
            ? grades.filter(g => g.score >= 90).length
            : 0;

          // Calculate performance by battalion
          const battalionPerformance = grades
            ? Object.values(
                grades.reduce((acc: any, grade) => {
                  const bn = grade.battalions.name;
                  if (!acc[bn]) {
                    acc[bn] = {
                      name: bn,
                      scores: [],
                      passing: 0
                    };
                  }
                  acc[bn].scores.push(grade.score);
                  if (grade.score >= 75) acc[bn].passing++;
                  return acc;
                }, {})
              ).map((b: any) => ({
                name: b.name,
                average:
                  b.scores.reduce((a: number, b: number) => a + b, 0) /
                  b.scores.length,
                passing: (b.passing / b.scores.length) * 100
              }))
            : [];

          // Mock enrollment trend data (replace with real data)
          const enrollmentTrend = [
            { month: 'Jan', cadets: 150 },
            { month: 'Feb', cadets: 180 },
            { month: 'Mar', cadets: 200 },
            { month: 'Apr', cadets: 220 },
            { month: 'May', cadets: 240 },
            { month: 'Jun', cadets: 260 }
          ];

          setStats({
            totalCadets: totalCadets || 0,
            totalBattalions: totalBattalions || 0,
            activeOfficers: activeOfficers || 0,
            averagePerformance,
            recentUpdates,
            topPerformers,
            enrollmentTrend,
            performanceByBattalion: battalionPerformance
          });
        }
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        toast.error('Failed to load dashboard statistics');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardStats();
  }, [router, supabase, officerBattalionId]);

  // Customize cards based on role
  const getStatsCards = () => {
    if (userRole === 'cadet') {
      return (
        <>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">My Average</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.averagePerformance.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">
                Overall performance
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Recent Updates
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.recentUpdates}</div>
              <p className="text-xs text-muted-foreground">
                In the last 24 hours
              </p>
            </CardContent>
          </Card>
        </>
      );
    }

    // Return default stats cards for other roles
    return (
      <>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cadets</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalCadets}</div>
            <p className="text-xs text-muted-foreground">
              Active enrolled cadets
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Battalions</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalBattalions}</div>
            <p className="text-xs text-muted-foreground">
              Active training battalions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Average Performance
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.averagePerformance.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Overall cadet performance
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Top Performers
            </CardTitle>
            <Medal className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.topPerformers}</div>
            <p className="text-xs text-muted-foreground">
              Cadets with 90% or higher
            </p>
          </CardContent>
        </Card>
      </>
    );
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6 p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          {userRole === 'cadet'
            ? 'Your performance overview'
            : userRole === 'rotc_officer'
            ? 'Battalion performance overview'
            : 'System-wide performance overview'}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {getStatsCards()}
      </div>

      {/* Charts Section - Only show for coordinator and ROTC officer */}
      {userRole !== 'cadet' && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Enrollment Trend</CardTitle>
              <CardDescription>
                Monthly cadet enrollment numbers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={stats?.enrollmentTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="cadets"
                    stroke="#8884d8"
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Battalion Performance</CardTitle>
              <CardDescription>Average scores by battalion</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats?.performanceByBattalion}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="average" fill="#8884d8" name="Average Score" />
                  <Bar dataKey="passing" fill="#82ca9d" name="Passing Rate" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
