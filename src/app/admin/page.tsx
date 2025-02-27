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
  ChevronUp
} from 'lucide-react';
import { gradeService } from '@/lib/services/gradeService';
import { Badge } from '@/components/ui/badge';
import { AnalyticsCharts } from './grades/components/AnalyticsCharts';
import { Leaderboard } from './grades/components/Leaderboard';

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    const fetchStats = async () => {
      try {
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
              (scores.length
                ? scores.reduce((a, b) => a + b) / scores.length
                : 0)
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
              new Date(g.updated_at) >
              new Date(Date.now() - 24 * 60 * 60 * 1000)
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
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 p-8">
      {/* Welcome Section */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome Back</h1>
          <p className="text-muted-foreground mt-2">
            Here's what's happening in your ROTC program
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          Term: {stats.currentTerm}
        </Badge>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Cadets Card */}
        <Card className="bg-white hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Total Cadets
                </p>
                <h3 className="text-2xl font-bold mt-2">{stats.totalCadets}</h3>
                <div className="flex items-center mt-2 text-sm">
                  <ChevronUp className="w-4 h-4 text-emerald-500 mr-1" />
                  <span className="text-emerald-500 font-medium">2.5%</span>
                  <span className="text-slate-400 ml-1">vs last term</span>
                </div>
              </div>
              <div className="p-3 bg-blue-50 rounded-full">
                <Users className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Average Performance Card */}
        <Card className="bg-white hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Average Performance
                </p>
                <h3 className="text-2xl font-bold mt-2">
                  {stats.avgPerformance}%
                </h3>
                <div className="flex items-center mt-2">
                  <Badge
                    variant={
                      stats.avgPerformance >= 75 ? 'success' : 'destructive'
                    }>
                    {stats.avgPerformance >= 75
                      ? 'Above Target'
                      : 'Below Target'}
                  </Badge>
                </div>
              </div>
              <div className="p-3 bg-emerald-50 rounded-full">
                <Activity className="w-6 h-6 text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Performers Card */}
        <Card className="bg-white hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Top Performers
                </p>
                <h3 className="text-2xl font-bold mt-2">
                  {stats.topPerformers}
                </h3>
                <div className="flex items-center mt-2 text-sm text-slate-500">
                  <Star className="w-4 h-4 text-amber-400 mr-1" />
                  <span>90% or higher</span>
                </div>
              </div>
              <div className="p-3 bg-amber-50 rounded-full">
                <Medal className="w-6 h-6 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Updates Card */}
        <Card className="bg-white hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Recent Updates
                </p>
                <h3 className="text-2xl font-bold mt-2">
                  {stats.recentUpdates}
                </h3>
                <div className="flex items-center mt-2 text-sm text-slate-500">
                  <Clock className="w-4 h-4 mr-1" />
                  <span>Last 24 hours</span>
                </div>
              </div>
              <div className="p-3 bg-purple-50 rounded-full">
                <Clock className="w-6 h-6 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Section */}
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

        {/* Leaderboard Section */}
        <Card>
          <CardHeader>
            <CardTitle>Top Performers</CardTitle>
          </CardHeader>
          <CardContent>
            <Leaderboard data={stats.leaderboard} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
