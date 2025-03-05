'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart,
  LineChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Plus,
  Download,
  Filter,
  Search,
  AlertCircle,
  Info,
  Users,
  Target,
  TrendingUp,
  Trophy,
  Building2
} from 'lucide-react';
import { GradesTable } from './components/GradesTable';
import { GradeForm } from './components/GradeForm';
import { type ColumnDef } from '@tanstack/react-table';
import {
  type CadetGrade,
  type GradeEntry,
  type TermPerformance,
  type GradeStats
} from '@/lib/types/grade';
import { gradeService } from '@/lib/services/gradeService';
import { AnalyticsCharts } from './components/AnalyticsCharts';
import { Leaderboard } from './components/Leaderboard';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { useRouter, useSearchParams } from 'next/navigation';
import { columns } from './components/columns';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
  TableHead
} from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { battalionService } from '@/lib/services/battalionService';

interface GroupedGrade {
  id: string;
  student_name: string;
  student_no: string;
  term: string;
  grades: {
    academics: { id: string; score: number } | null;
    leadership: { id: string; score: number } | null;
    physical_fitness: { id: string; score: number } | null;
  };
  instructor_notes: string;
  created_at: string;
  updated_at: string;
  course?: string;
  profiles?: {
    course?: string;
    battalion_id?: string;
  };
}

interface GradeData {
  score: number;
  updated_at: string;
  instructor_id: string;
}

interface TermGrade {
  term: string;
  grades: {
    [key: string]: GradeData;
  };
  status: string;
}

interface GradeStats {
  totalCadets: number;
  averageScore: number;
  passingRate: number;
  categoryBreakdown: {
    academics: { total: number; passing: number; average: number };
    leadership: { total: number; passing: number; average: number };
    physical_fitness: { total: number; passing: number; average: number };
  };
  coursePerformance: Record<string, { total: number; average: number }>;
}

interface Battalion {
  id: string;
  name: string;
}

interface BattalionInfo {
  id: string;
  name: string;
  total_cadets: number;
}

export default function GradesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [grades, setGrades] = useState<GroupedGrade[]>([]);
  const [cadetGrades, setCadetGrades] = useState<{
    grades: {
      [key: string]: GradeData;
    };
    overall_score: number;
    status: string;
    term_history: TermGrade[];
    rank?: string;
  } | null>(null);
  const [currentTerm, setCurrentTerm] = useState<string>('');
  const [formOpen, setFormOpen] = useState(false);
  const [selectedGrade, setSelectedGrade] = useState<GroupedGrade | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [stats, setStats] = useState<GradeStats>({
    totalCadets: 0,
    averageScore: 0,
    passingRate: 0,
    categoryBreakdown: {
      academics: { total: 0, passing: 0, average: 0 },
      leadership: { total: 0, passing: 0, average: 0 },
      physical_fitness: { total: 0, passing: 0, average: 0 }
    },
    coursePerformance: {}
  });

  const [analyticsData, setAnalyticsData] = useState({
    performanceData: [],
    trendData: []
  });
  const [leaderboard, setLeaderboard] = useState<TermPerformance[]>([]);
  const supabase = createClientComponentClient();
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const [selectedBattalion, setSelectedBattalion] = useState<string>('all');
  const [groupByCourse, setGroupByCourse] = useState(false);
  const [courses, setCourses] = useState<string[]>([]);
  const [groupByTerm, setGroupByTerm] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [battalions, setBattalions] = useState<Battalion[]>([]);
  const [officerBattalionId, setOfficerBattalionId] = useState<string | null>(
    null
  );
  const [officerBattalion, setOfficerBattalion] =
    useState<BattalionInfo | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  // Handle URL params for filtering
  useEffect(() => {
    const category = searchParams.get('category');
    if (category) {
      setSelectedCategory(category);
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchUserAndGrades = async () => {
      try {
        setLoading(true);
        const supabase = createClientComponentClient();

        // Get user session and profile
        const {
          data: { session }
        } = await supabase.auth.getSession();
        if (!session) {
          router.push('/login');
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role, id')
          .eq('id', session.user.id)
          .single();

        if (profileError) throw profileError;
        setUserRole(profile?.role);
        setUserId(profile?.id);

        // If ROTC officer, get their assigned battalion with more details
        if (profile?.role === 'rotc_officer') {
          const { data: battalionData } = await supabase
            .from('battalions')
            .select(
              `
              id,
              name,
              members:battalion_members (count)
            `
            )
            .eq('commander_id', profile.id)
            .single();

          setOfficerBattalion({
            id: battalionData.id,
            name: battalionData.name,
            total_cadets: battalionData.members[0].count
          });
          setOfficerBattalionId(battalionData.id);
        }

        // Fetch grades based on role
        if (profile?.role === 'cadet') {
          const { data: termData } = await gradeService.getCurrentTerm();
          setCurrentTerm(termData);

          const cadetGradesData = await gradeService.getCurrentTermGrades(
            profile.id
          );
          setCadetGrades(cadetGradesData);

          // Get performance stats for this cadet only
          const statsData = await gradeService.getPerformanceStats(profile.id);
          setStats(statsData);
        } else {
          const gradesData = await gradeService.getGrades();
          setGrades(gradesData);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load grades data');
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndGrades();
  }, [router]);

  // Fetch courses and battalions on component mount
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        // Fetch unique courses from profiles
        const { data: coursesData } = await supabase
          .from('profiles')
          .select('course')
          .eq('role', 'cadet')
          .not('course', 'is', null);

        const uniqueCourses = [
          ...new Set(coursesData?.map(p => p.course))
        ].filter(Boolean);
        setCourses(uniqueCourses);

        // Fetch battalions
        const battalionsData = await battalionService.getBattalions();
        setBattalions(battalionsData);
      } catch (error) {
        console.error('Error fetching filters:', error);
        toast.error('Failed to load filters');
      }
    };

    fetchFilters();
  }, []);

  // Filter grades based on course and battalion
  const filteredGrades = useMemo(() => {
    return grades.filter(grade => {
      // Base filters for course and battalion
      const matchesCourse =
        selectedCourse === 'all' || grade.course === selectedCourse;
      const matchesBattalion =
        selectedBattalion === 'all' ||
        grade.battalion?.id === selectedBattalion;

      // For ROTC officers, only show grades from their battalion
      if (userRole === 'rotc_officer') {
        return matchesCourse && grade.battalion?.id === officerBattalionId;
      }

      return matchesCourse && matchesBattalion;
    });
  }, [grades, selectedCourse, selectedBattalion, userRole, officerBattalionId]);

  // Group grades by course if enabled
  const groupedGrades = useMemo(() => {
    if (!groupByCourse) return { all: filteredGrades };

    return filteredGrades.reduce((acc, grade) => {
      const course = grade.course || 'Uncategorized';
      if (!acc[course]) acc[course] = [];
      acc[course].push(grade);
      return acc;
    }, {} as Record<string, typeof filteredGrades>);
  }, [filteredGrades, groupByCourse]);

  // Update stats when grades change
  useEffect(() => {
    setStats({
      totalCadets: grades.length,
      averageScore: Math.round(
        grades.reduce((sum, grade) => {
          const scores = [
            grade.grades.academics?.score,
            grade.grades.leadership?.score,
            grade.grades.physical_fitness?.score
          ].filter(Boolean);
          return (
            sum +
            (scores.length
              ? scores.reduce((a, b) => a + b, 0) / scores.length
              : 0)
          );
        }, 0) / (grades.length || 1)
      ),
      passingRate: Math.round(
        (grades.filter(grade => {
          const scores = [
            grade.grades.academics?.score,
            grade.grades.leadership?.score,
            grade.grades.physical_fitness?.score
          ].filter(Boolean);
          const avg = scores.length
            ? scores.reduce((a, b) => a + b, 0) / scores.length
            : 0;
          return avg >= 75;
        }).length /
          (grades.length || 1)) *
          100
      ),
      recentUpdates: grades.filter(
        grade =>
          new Date(grade.updated_at) >
          new Date(Date.now() - 24 * 60 * 60 * 1000)
      ).length,
      categoryBreakdown: {
        academics: {
          total: grades.filter(g => g.grades.academics?.score).length,
          passing: grades.filter(
            g => g.grades.academics?.score && g.grades.academics?.score >= 75
          ).length,
          average: Math.round(
            grades
              .filter(g => g.grades.academics?.score)
              .reduce((sum, g) => sum + g.grades.academics?.score, 0) /
              grades.filter(g => g.grades.academics?.score).length
          )
        },
        leadership: {
          total: grades.filter(g => g.grades.leadership?.score).length,
          passing: grades.filter(
            g => g.grades.leadership?.score && g.grades.leadership?.score >= 75
          ).length,
          average: Math.round(
            grades
              .filter(g => g.grades.leadership?.score)
              .reduce((sum, g) => sum + g.grades.leadership?.score, 0) /
              grades.filter(g => g.grades.leadership?.score).length
          )
        },
        physical_fitness: {
          total: grades.filter(g => g.grades.physical_fitness?.score).length,
          passing: grades.filter(
            g =>
              g.grades.physical_fitness?.score &&
              g.grades.physical_fitness?.score >= 75
          ).length,
          average: Math.round(
            grades
              .filter(g => g.grades.physical_fitness?.score)
              .reduce((sum, g) => sum + g.grades.physical_fitness?.score, 0) /
              grades.filter(g => g.grades.physical_fitness?.score).length
          )
        }
      },
      coursePerformance: {}
    });
  }, [grades]);

  // Calculate analytics data when grades change
  useEffect(() => {
    // Performance data
    const performanceData = Object.entries(stats.categoryBreakdown).map(
      ([category, data]) => ({
        category: category.replace('_', ' '),
        average: data.average,
        passing: Math.round((data.passing / data.total) * 100) || 0,
        total: data.total
      })
    );

    // Trend data (you'll need to fetch historical data)
    const trendData = [
      {
        term: currentTerm,
        academics: stats.categoryBreakdown.academics.average,
        leadership: stats.categoryBreakdown.leadership.average,
        physical_fitness: stats.categoryBreakdown.physical_fitness.average
      }
    ];

    setAnalyticsData({
      performanceData,
      trendData
    });

    // Calculate leaderboard data
    const leaderboardData = grades
      .map(grade => ({
        student_id: grade.id,
        student_name: grade.student_name,
        student_no: grade.student_no,
        term: grade.term,
        grades: grade.grades,
        overall_score:
          Object.values(grade.grades)
            .filter(g => g?.score)
            .reduce((sum, g) => sum + (g?.score || 0), 0) /
            Object.values(grade.grades).filter(g => g?.score).length || 0
      }))
      .sort((a, b) => b.overall_score - a.overall_score)
      .slice(0, 10);

    setLeaderboard(leaderboardData);
  }, [grades, stats, currentTerm]);

  // Actions
  const handleEdit = (grade: GroupedGrade) => {
    setSelectedGrade(grade);
    setFormOpen(true);
  };

  const handleDelete = async (grade: GroupedGrade) => {
    try {
      await gradeService.deleteGrade(grade.id);
      toast.success('Grade deleted successfully');
      fetchData(); // Refresh data
    } catch (error) {
      console.error('Error deleting grade:', error);
      toast.error('Failed to delete grade');
    }
  };

  const handleExport = async () => {
    try {
      const csvData = await gradeService.exportGrades(currentTerm);
      // Create and download CSV file
      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `grades-${currentTerm}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting grades:', error);
      toast.error('Failed to export grades');
    }
  };

  const calculateAnalytics = async (gradesData: GroupedGrade[]) => {
    // Calculate performance data
    const performanceData = Object.entries(stats.categoryBreakdown).map(
      ([category, data]) => ({
        category: category.replace('_', ' '),
        average: data.average,
        passing: Math.round((data.passing / data.total) * 100) || 0,
        total: data.total
      })
    );

    // Calculate trend data
    const terms = [...new Set(gradesData.map(g => g.term))].sort();
    const trendData = terms.map(term => {
      const termGrades = gradesData.filter(g => g.term === term);
      return {
        term,
        academics: Math.round(
          termGrades.reduce((sum, grade) => {
            const score = grade.grades.academics?.score || 0;
            return sum + score;
          }, 0) / (termGrades.length || 1)
        ),
        leadership: Math.round(
          termGrades.reduce((sum, grade) => {
            const score = grade.grades.leadership?.score || 0;
            return sum + score;
          }, 0) / (termGrades.length || 1)
        ),
        physical_fitness: Math.round(
          termGrades.reduce((sum, grade) => {
            const score = grade.grades.physical_fitness?.score || 0;
            return sum + score;
          }, 0) / (termGrades.length || 1)
        )
      };
    });

    // Update analytics state
    setAnalyticsData({
      performanceData,
      trendData
    });

    // Calculate stats
    const totalCadets = gradesData.length;
    const averageScore = Math.round(
      performanceData.reduce((sum, cat) => sum + cat.average, 0) / 3
    );
    const passRate = Math.round(
      (performanceData.reduce((sum, cat) => sum + cat.passing, 0) /
        (totalCadets * 3)) *
        100
    );

    setStats({
      totalCadets,
      averageScore,
      passingRate: passRate,
      recentUpdates: gradesData.filter(
        g =>
          new Date(g.updated_at).getTime() >
          new Date().getTime() - 7 * 24 * 60 * 60 * 1000
      ).length,
      categoryBreakdown: {
        academics: {
          total: gradesData.filter(g => g.grades.academics?.score).length,
          passing: gradesData.filter(
            g => g.grades.academics?.score && g.grades.academics?.score >= 75
          ).length,
          average: Math.round(
            gradesData
              .filter(g => g.grades.academics?.score)
              .reduce((sum, g) => sum + g.grades.academics?.score, 0) /
              gradesData.filter(g => g.grades.academics?.score).length
          )
        },
        leadership: {
          total: gradesData.filter(g => g.grades.leadership?.score).length,
          passing: gradesData.filter(
            g => g.grades.leadership?.score && g.grades.leadership?.score >= 75
          ).length,
          average: Math.round(
            gradesData
              .filter(g => g.grades.leadership?.score)
              .reduce((sum, g) => sum + g.grades.leadership?.score, 0) /
              gradesData.filter(g => g.grades.leadership?.score).length
          )
        },
        physical_fitness: {
          total: gradesData.filter(g => g.grades.physical_fitness?.score)
            .length,
          passing: gradesData.filter(
            g =>
              g.grades.physical_fitness?.score &&
              g.grades.physical_fitness?.score >= 75
          ).length,
          average: Math.round(
            gradesData
              .filter(g => g.grades.physical_fitness?.score)
              .reduce((sum, g) => sum + g.grades.physical_fitness?.score, 0) /
              gradesData.filter(g => g.grades.physical_fitness?.score).length
          )
        }
      },
      coursePerformance: {}
    });

    // Calculate leaderboard
    const leaderboardData = gradesData
      .map(grade => ({
        student_id: grade.id,
        student_name: grade.student_name,
        student_no: grade.student_no,
        term: grade.term,
        grades: grade.grades,
        overall_score:
          Math.round(
            (grade.grades.academics?.score || 0) +
              (grade.grades.leadership?.score || 0) +
              (grade.grades.physical_fitness?.score || 0)
          ) / 3
      }))
      .sort((a, b) => b.overall_score - a.overall_score)
      .slice(0, 10);

    setLeaderboard(leaderboardData);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [gradesData, termData] = await Promise.all([
        gradeService.getGrades(),
        gradeService.getCurrentTerm()
      ]);
      setGrades(gradesData);
      setCurrentTerm(termData);

      console.log({ gradesData });
      await calculateAnalytics(gradesData);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch grades');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to calculate overall score
  const calculateOverallScore = (grades: Record<string, { score: number }>) => {
    const scores = Object.values(grades).map(g => g.score);
    if (!scores.length) return 0;
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  };

  // Helper function to determine status based on grades
  const determineStatus = (grades: Record<string, { score: number }>) => {
    const overall = calculateOverallScore(grades);
    if (overall >= 90) return 'excellent';
    if (overall >= 85) return 'good';
    if (overall >= 75) return 'pass';
    return 'needs_improvement';
  };

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Pass userId for cadet view
        const statsData = await gradeService.getPerformanceStats(
          userRole === 'cadet' ? userId : undefined
        );
        setStats(statsData);
      } catch (error) {
        console.error('Error fetching stats:', error);
        // toast.error('Failed to load performance statistics');
      }
    };

    fetchStats();
  }, [userRole, userId]);

  // Cadet View Component
  const CadetGradesView = () => {
    if (!cadetGrades) return null;

    return (
      <div className="space-y-6">
        {/* Overview Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Overall Grade
              </CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {cadetGrades.overall_score}%
              </div>
              <Badge
                className="mt-2"
                variant={getStatusVariant(cadetGrades.status)}>
                {formatStatus(cadetGrades.status)}
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Current Term
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currentTerm}</div>
              <p className="text-xs text-muted-foreground mt-2">
                Academic Year {currentTerm?.split('-')[0]}
              </p>
            </CardContent>
          </Card>

          {cadetGrades.rank && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Class Ranking
                </CardTitle>
                <Trophy className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{cadetGrades.rank}</div>
                <p className="text-xs text-muted-foreground mt-2">
                  Among {stats.totalCadets} cadets
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Current Term Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Current Term Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(cadetGrades.grades).map(([category, data]) => (
                <div key={category} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium capitalize">
                        {category.replace('_', ' ')}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Last updated:{' '}
                        {new Date(data?.updated_at || '').toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">{data?.score || 0}%</p>
                      <Badge variant={getScoreVariant(data?.score || 0)}>
                        {getScoreStatus(data?.score || 0)}
                      </Badge>
                    </div>
                  </div>
                  <Progress
                    value={data?.score || 0}
                    className="h-2"
                    indicatorClassName={cn(
                      data?.score >= 90
                        ? 'bg-green-500'
                        : data?.score >= 75
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                    )}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Term History */}
        <Card>
          <CardHeader>
            <CardTitle>Grade History</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Term</TableHead>
                  <TableHead>Academics</TableHead>
                  <TableHead>Leadership</TableHead>
                  <TableHead>Physical Fitness</TableHead>
                  <TableHead>Overall</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cadetGrades.term_history?.map(term => {
                  const academicsScore = term.grades.academics?.score || 0;
                  const leadershipScore = term.grades.leadership?.score || 0;
                  const physicalScore =
                    term.grades.physical_fitness?.score || 0;
                  const overallScore = Math.round(
                    (academicsScore + leadershipScore + physicalScore) / 3
                  );

                  return (
                    <TableRow key={term.term}>
                      <TableCell className="font-medium">{term.term}</TableCell>
                      <TableCell>{academicsScore}%</TableCell>
                      <TableCell>{leadershipScore}%</TableCell>
                      <TableCell>{physicalScore}%</TableCell>
                      <TableCell>{overallScore}%</TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(term.status)}>
                          {formatStatus(term.status)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Main render logic
  if (loading) return <GradesPageSkeleton />;

  // Show cadet view if user is a cadet
  if (userRole === 'cadet') {
    return (
      <div className="space-y-6 p-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My Grades</h1>
          <p className="text-sm text-muted-foreground mt-1">
            View your academic performance and grade history
          </p>
        </div>
        <CadetGradesView />
      </div>
    );
  }

  // Admin View - Keep existing admin functionality
  return (
    <div className="space-y-6 p-8">
      {/* Header Section */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Grades & Performance
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage and track cadet performance evaluations
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Grade
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-4">
        <div className="w-64">
          <Label>Course</Label>
          <Select value={selectedCourse} onValueChange={setSelectedCourse}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by course" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Courses</SelectItem>
              {courses.map(course => (
                <SelectItem key={course} value={course}>
                  {course}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Only show battalion filter for non-ROTC officers */}
        {userRole !== 'rotc_officer' && (
          <div className="w-64">
            <Label>Battalion</Label>
            <Select
              value={selectedBattalion}
              onValueChange={setSelectedBattalion}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by battalion" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Battalions</SelectItem>
                {battalions.map(battalion => (
                  <SelectItem key={battalion.id} value={battalion.id}>
                    {battalion.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {userRole === 'rotc_officer' && officerBattalion && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Battalion</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{officerBattalion.name}</div>
              <p className="text-xs text-muted-foreground">
                {officerBattalion.total_cadets} cadets enrolled
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {userRole === 'rotc_officer'
                ? 'Battalion Cadets'
                : 'Total Cadets'}
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {userRole === 'rotc_officer'
                ? officerBattalion?.total_cadets || 0
                : stats?.totalCadets || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {userRole === 'rotc_officer'
                ? 'Cadets in your battalion'
                : 'Currently enrolled cadets'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.averageScore.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {userRole === 'rotc_officer'
                ? 'Battalion average performance'
                : 'Overall average performance'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Passing Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.passingRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {userRole === 'rotc_officer'
                ? 'Battalion passing rate'
                : 'Overall passing rate'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="grades" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px] bg-primary text-primary-foreground">
          <TabsTrigger value="grades">Grades</TabsTrigger>
          {/* <TabsTrigger value="analytics">Analytics</TabsTrigger> */}
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
        </TabsList>

        <TabsContent value="grades" className="space-y-4">
          {/* Search and Filter Section */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or student number..."
                className="pl-8"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>

          {/* Grades Table/Cards */}
          {groupByTerm ? (
            <div className="grid gap-4">
              {courses.map(course => (
                <Card key={course}>
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold flex items-center justify-between">
                      {course}
                      <Badge variant="secondary" className="ml-2">
                        {grades.filter(g => g.course === course).length}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <GradesTable
                      columns={columns}
                      data={grades
                        .filter(g => g.course === course)
                        .map(grade => ({
                          ...grade,
                          onEdit: () => {
                            setSelectedGrade(grade);
                            setFormOpen(true);
                          }
                        }))}
                      handleEdit={grade => {
                        setSelectedGrade(grade);
                        setFormOpen(true);
                      }}
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <GradesTable
                  columns={columns}
                  data={filteredGrades.map(grade => ({
                    ...grade,
                    onEdit: () => {
                      setSelectedGrade(grade);
                      setFormOpen(true);
                    }
                  }))}
                  handleEdit={grade => {
                    setSelectedGrade(grade);
                    setFormOpen(true);
                  }}
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="analytics">
          <AnalyticsCharts
            performanceData={analyticsData.performanceData}
            trendData={analyticsData.trendData}
          />
        </TabsContent>

        <TabsContent value="leaderboard">
          <Leaderboard data={leaderboard} />
        </TabsContent>
      </Tabs>

      {/* Grade Form Dialog */}
      <GradeForm
        open={formOpen}
        onOpenChange={open => {
          setFormOpen(open);
          if (!open) setSelectedGrade(null);
        }}
        grade={selectedGrade}
        onSuccess={fetchData}
        defaultTerm={currentTerm}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Grade Entry</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this grade entry? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (selectedGrade) {
                  handleDelete(selectedGrade);
                }
                setDeleteDialogOpen(false);
                setSelectedGrade(null);
              }}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function GradesPageSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64 mt-1" />
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map(i => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-3 w-32 mt-1" />
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function getScoreColorClass(score: number | undefined) {
  if (!score) return 'bg-gray-200';
  if (score >= 90) return 'bg-green-500';
  if (score >= 75) return 'bg-blue-500';
  return 'bg-red-500';
}

function getStatusVariant(status: string | undefined) {
  switch (status) {
    case 'excellent':
      return 'success';
    case 'good':
      return 'default';
    case 'pass':
      return 'secondary';
    case 'needs_improvement':
      return 'destructive';
    default:
      return 'outline';
  }
}

function formatStatus(status: string | undefined) {
  if (!status) return 'Not Available';
  return status
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Helper functions
function getScoreVariant(score: number) {
  if (score >= 90) return 'success';
  if (score >= 75) return 'warning';
  return 'destructive';
}

function getScoreStatus(score: number) {
  if (score >= 90) return 'Excellent';
  if (score >= 75) return 'Pass';
  return 'Needs Improvement';
}
