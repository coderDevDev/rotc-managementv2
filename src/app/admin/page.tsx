'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Users,
  GraduationCap,
  Award,
  TrendingUp,
  Clock,
  Star,
  Medal,
  Activity,
  ChevronUp,
  Lock
} from 'lucide-react';
import { gradeService } from '@/lib/services/gradeService';
import { Badge } from '@/components/ui/badge';
import { AnalyticsCharts } from './grades/components/AnalyticsCharts';
import { Leaderboard } from './grades/components/Leaderboard';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalCadets: 0,
    avgPerformance: 0,
    topPerformers: 0,
    recentUpdates: 0,
    currentTerm: '',
    analyticsData: {
      performanceData: [],
      trendData: []
    },
    leaderboard: []
  });

  const supabase = createClientComponentClient();

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const {
          data: { session }
        } = await supabase.auth.getSession();
        if (!session) return;

        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();

        setUserRole(profile?.role);
      } catch (error) {
        console.error('Error fetching user role:', error);
      }
    };

    fetchUserRole();
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const [grades, currentTerm] = await Promise.all([
        gradeService.getGrades(),
        gradeService.getCurrentTerm()
      ]);

      // Calculate stats
      const totalCadets = new Set(grades.map(g => g.id)).size;
      const avgPerformance = Math.round(
        grades.reduce((sum, grade) => {
          const scores = Object.values(grade.grades)
            .filter(g => g?.score)
            .map(g => g!.score);
          return (
            sum +
            (scores.length ? scores.reduce((a, b) => a + b) / scores.length : 0)
          );
        }, 0) / totalCadets
      );

      // Calculate performance data
      const performanceData = [
        {
          category: 'Academics',
          average: calculateCategoryAverage(grades, 'academics'),
          passing: calculatePassingRate(grades, 'academics')
        },
        {
          category: 'Leadership',
          average: calculateCategoryAverage(grades, 'leadership'),
          passing: calculatePassingRate(grades, 'leadership')
        },
        {
          category: 'Physical Fitness',
          average: calculateCategoryAverage(grades, 'physical_fitness'),
          passing: calculatePassingRate(grades, 'physical_fitness')
        }
      ];

      // Calculate leaderboard data
      const leaderboard = grades
        .map(grade => ({
          student_id: grade.id,
          student_name: grade.student_name,
          student_no: grade.student_no,
          term: grade.term,
          grades: grade.grades,
          overall_score: calculateOverallScore(grade.grades)
        }))
        .sort((a, b) => b.overall_score - a.overall_score)
        .slice(0, 10);

      setStats({
        totalCadets,
        avgPerformance,
        topPerformers: grades.filter(g =>
          Object.values(g.grades).every(score => score && score.score >= 90)
        ).length,
        recentUpdates: grades.filter(
          g =>
            new Date(g.updated_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)
        ).length,
        currentTerm,
        analyticsData: {
          performanceData,
          trendData: [] // You can add trend data calculation here
        },
        leaderboard
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const calculateCategoryAverage = (grades: any[], category: string) => {
    const scores = grades.map(g => g.grades[category]?.score).filter(Boolean);
    return scores.length
      ? Math.round(scores.reduce((a, b) => a + b) / scores.length)
      : 0;
  };

  const calculatePassingRate = (grades: any[], category: string) => {
    return Math.round(
      (grades.filter(g => (g.grades[category]?.score || 0) >= 75).length /
        grades.length) *
        100
    );
  };

  const calculateOverallScore = (grades: any) => {
    const scores = Object.values(grades)
      .filter(g => g?.score)
      .map(g => g!.score);
    return scores.length ? scores.reduce((a, b) => a + b) / scores.length : 0;
  };

  const isCoordinator = userRole === 'rotc_coordinator';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6 p-8">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-8 rounded-lg">
        <motion.div
          initial={{ y: -20 }}
          animate={{ y: 0 }}
          className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
              Dashboard
            </h1>
            <p className="text-muted-foreground mt-2">
              {isCoordinator
                ? 'Welcome to the ROTC Management Dashboard'
                : 'Welcome to your ROTC Dashboard'}
            </p>
          </div>
          <Badge variant="outline" className="text-sm">
            Term: {stats.currentTerm}
          </Badge>
        </motion.div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Stats cards with role-based access */}
        {(isCoordinator
          ? [
              {
                title: 'Total Cadets',
                value: stats.totalCadets,
                icon: Users,
                trend: '+2.5%',
                trendUp: true
              },
              {
                title: 'Average Performance',
                value: `${stats.avgPerformance}%`,
                icon: Activity,
                status: stats.avgPerformance >= 75 ? 'success' : 'destructive'
              },
              {
                title: 'Top Performers',
                value: stats.topPerformers,
                icon: Medal,
                description: '90% or higher'
              },
              {
                title: 'Recent Updates',
                value: stats.recentUpdates,
                icon: Clock,
                description: 'Last 24 hours'
              }
            ]
          : [
              {
                title: 'Your Performance',
                value: `${stats.avgPerformance}%`,
                icon: Activity,
                status: stats.avgPerformance >= 75 ? 'success' : 'destructive'
              },
              {
                title: 'Your Rank',
                value: '15th',
                icon: Medal,
                description: 'Out of all cadets'
              }
            ]
        ).map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}>
            <Card className="hover:shadow-md transition-all duration-200">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {stat.title}
                    </p>
                    <h3 className="text-2xl font-bold mt-2">{stat.value}</h3>
                    {stat.trend && (
                      <div className="flex items-center mt-2 text-sm">
                        <ChevronUp className="w-4 h-4 text-emerald-500 mr-1" />
                        <span className="text-emerald-500">{stat.trend}</span>
                      </div>
                    )}
                    {stat.status && (
                      <Badge variant={stat.status}>
                        {stat.status === 'success'
                          ? 'Above Target'
                          : 'Below Target'}
                      </Badge>
                    )}
                    {stat.description && (
                      <p className="text-sm text-muted-foreground mt-2">
                        {stat.description}
                      </p>
                    )}
                  </div>
                  <div
                    className={`p-3 rounded-full ${
                      stat.status === 'destructive'
                        ? 'bg-red-50'
                        : 'bg-primary/5'
                    }`}>
                    <stat.icon
                      className={`w-6 h-6 ${
                        stat.status === 'destructive'
                          ? 'text-red-500'
                          : 'text-primary'
                      }`}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Analytics Section - Only visible to coordinators */}
      {isCoordinator && (
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Performance Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <AnalyticsCharts
                performanceData={stats.analyticsData.performanceData}
                trendData={stats.analyticsData.trendData}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top Performers</CardTitle>
            </CardHeader>
            <CardContent>
              <Leaderboard data={stats.leaderboard} />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Cadet-specific content */}
      {!isCoordinator && (
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Your Performance History</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Add cadet-specific performance chart here */}
            </CardContent>
          </Card>
        </div>
      )}
    </motion.div>
  );
}
