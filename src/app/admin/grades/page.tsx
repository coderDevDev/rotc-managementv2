'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
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
  Building2,
  Pencil,
  Printer,
  FileDown
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
import { ROTCGradesTable } from './components/ROTCGradesTable';
import { useReactToPrint } from 'react-to-print';
import { rotcGradeService } from '@/lib/services/rotcGradeService';

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

// Define ROTC-specific grade calculation types and interfaces
interface ROTCGrade {
  id: string;
  student_id: string;
  student_name: string;
  student_no: string;
  attendance_score: number; // 30%
  aptitude_score: number; // 30%
  final_grade: number; // attendance + aptitude (60%)
  exam_score: number; // Raw exam score
  exam_grade: number; // Calculated as exam_score/100 * 40
  overall_grade: number; // final_grade + exam_grade
  equivalent: number; // Converted grade (1.0-5.0)
  status: string; // PASSED or FAILED
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
  const [currentTerm, setCurrentTerm] = useState<string>('all');
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
  const [selectedGender, setSelectedGender] = useState<string>('all');
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

  // Create a toggle to switch between standard and ROTC grading views
  const [gradingSystem, setGradingSystem] = useState<'standard' | 'rotc'>(
    'standard'
  );

  const printRef = useRef(null);

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `ROTC_Grades_${currentTerm || 'All'}`
  });

  const handleExport = () => {
    // Format the grades data for CSV
    const rotcGrades = calculateROTCGrades(filteredGrades);

    // Create CSV headers
    const headers = [
      'NR',
      'Names',
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '8',
      '9',
      '10',
      '11',
      '12',
      '13',
      '14',
      '15',
      'ATTENDANCE 30%',
      'MERIT',
      'DEMERIT',
      'TTL',
      'FINAL GRADE',
      'EXAM 40%',
      'OVERALL GRADES',
      'EQUIVALENT',
      'REMARKS'
    ];

    // Create CSV rows
    const rows = rotcGrades.map((grade, index) => {
      // Create array of attendance days (2.0 or -)
      const attendanceDays = Array.from({ length: 15 }, (_, idx) => {
        const attendanceDays = Math.ceil(grade.attendance_score / 2);
        return idx < attendanceDays ? '2.0' : '-';
      });

      return [
        index + 1,
        grade.student_name,
        ...attendanceDays,
        grade.attendance_score.toFixed(1),
        '100',
        '0',
        '30',
        grade.final_grade.toFixed(1),
        grade.exam_grade.toFixed(1),
        grade.overall_grade.toFixed(1),
        grade.equivalent.toFixed(1),
        grade.status
      ];
    });

    // Convert to CSV string
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ROTC_Grades_${currentTerm || 'All'}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const [processedGrades, setProcessedGrades] = useState([]);

  // Make the setter function available to the ROTCGradesTable component
  useEffect(() => {
    // Define a global function that ROTCGradesTable can call to update the processed grades
    window.setProcessedGradesForPrint = data => {
      setProcessedGrades(data);
    };

    return () => {
      // Clean up when component unmounts
      window.setProcessedGradesForPrint = undefined;
    };
  }, []);

  useEffect(() => {
    fetchData();
  }, [currentTerm, selectedGender]);

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

        // Fetch grades based on role

        console.log({ profile });
        if (profile?.role === 'rotc_officer') {
          // ROTC Officer logic
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

          const gradesData = await gradeService.getGrades({
            gender: selectedGender !== 'all' ? selectedGender : undefined
          });
          {
            console.log({ gradesData });
          }
          setGrades(gradesData);
        } else if (profile?.role === 'cadet') {
          // Cadet logic
          const termData = await gradeService.getCurrentTerm();
          setCurrentTerm(termData.name);

          const gradesData = await gradeService.getGrades({
            userId: session.user.id,
            gender: selectedGender !== 'all' ? selectedGender : undefined
          });
          // Filter grades for current cadet
          setGrades(gradesData);

          // Get performance stats for this cadet only
          const statsData = await gradeService.getPerformanceStats(profile.id);
          setStats(statsData);
        } else {
          // Coordinator logic
          const termData = await gradeService.getCurrentTerm();
          setCurrentTerm(termData.name);
          const gradesData = await gradeService.getGrades({
            gender: selectedGender !== 'all' ? selectedGender : undefined
          });
          setGrades(gradesData);
        }

        // Fetch courses and battalions for filters
        const { data: coursesData } = await supabase
          .from('profiles')
          .select('course')
          .eq('role', 'cadet')
          .not('course', 'is', null);

        const uniqueCourses = [
          ...new Set(coursesData?.map(p => p.course))
        ].filter(Boolean);
        setCourses(uniqueCourses);

        const battalionsData = await battalionService.getBattalions();
        setBattalions(battalionsData);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load grades data');
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndGrades();
  }, [router]);

  // Filter grades based on course and battalion
  const filteredGrades = useMemo(() => {
    console.log({ grades });
    return grades.filter(grade => {
      const matchesTerm = currentTerm === 'all' || grade.term === currentTerm;
      const matchesCourse =
        selectedCourse === 'all' || grade.course === selectedCourse;
      const matchesBattalion =
        selectedBattalion === 'all' ||
        grade.battalion?.id === selectedBattalion;
      const matchesGender =
        selectedGender === 'all' || grade.gender === selectedGender;

      // For ROTC officers, only show grades from their battalion
      if (userRole === 'rotc_officer') {
        return (
          matchesCourse &&
          matchesBattalion &&
          matchesGender &&
          grade.battalion?.id === officerBattalionId
        );
      }

      return matchesCourse && matchesBattalion && matchesGender;
    });
  }, [
    grades,
    currentTerm,
    selectedCourse,
    selectedBattalion,
    selectedGender,
    userRole,
    officerBattalionId
  ]);

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

  const calculateAnalytics = async (gradesData: GroupedGrade[]) => {
    try {
      // Skip stats calculation if using ROTC grades
      if (gradingSystem === 'rotc') {
        return;
      }
      f;

      // Original stats calculation for regular grades
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
              g =>
                g.grades.leadership?.score && g.grades.leadership?.score >= 75
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
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: profile } = await supabase.auth.getUser();
      if (!profile || !profile.user) {
        router.push('/login');
        return;
      }

      setUserId(profile.user.id);
      const userDataResponse = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profile.user.id)
        .single();

      if (userDataResponse.error) throw userDataResponse.error;

      const userData = userDataResponse.data;
      setUserRole(userData.role);

      // Fetch appropriate data based on role
      if (userData.role === 'rotc_officer') {
        // ROTC Officer logic
        const battalionData = await supabase
          .from('officer_battalions')
          .select('id, name, members:cadet_count(*)')
          .eq('officer_id', profile.user.id)
          .single();

        if (battalionData.error) throw battalionData.error;

        setOfficerBattalion({
          id: battalionData.data.id,
          name: battalionData.data.name,
          total_cadets: battalionData.data.members[0].count
        });
        setOfficerBattalionId(battalionData.data.id);

        // Pass gender filter when fetching grades
        const gradesData = await gradeService.getGrades({
          gender: selectedGender !== 'all' ? selectedGender : undefined
        });

        setGrades(gradesData);
      } else if (userData.role === 'cadet') {
        // Cadet logic with gender filter
        const termData = await gradeService.getCurrentTerm();
        setCurrentTerm(termData.name);

        // Pass the user ID and gender filter
        const gradesData = await gradeService.getGrades({
          userId: profile.user.id,
          gender: selectedGender !== 'all' ? selectedGender : undefined
        });

        // Filter grades for current cadet
        setGrades(gradesData);

        // Rest of cadet logic...
      } else {
        // Admin logic
        const termData = await gradeService.getCurrentTerm();
        setCurrentTerm(termData.name);

        // Pass gender filter for admin
        const gradesData = await gradeService.getGrades({
          gender: selectedGender !== 'all' ? selectedGender : undefined
        });

        setGrades(gradesData);
      }

      // Rest of fetchData function...
    } catch (error) {
      console.error('Error fetching data:', error);
      //  toast.error('Error loading data');
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
    const fetchStats = async () => {};

    fetchStats();
  }, [userRole, userId]);

  // Add this component for cadet view
  function CadetGradesView() {
    const [loading, setLoading] = useState(true);
    const [grades, setGrades] = useState<any>(null);
    const [currentTerm, setCurrentTerm] = useState('');
    const supabase = createClientComponentClient();

    useEffect(() => {
      const fetchCadetGrades = async () => {
        try {
          setLoading(true);
          // Get current user
          const {
            data: { session }
          } = await supabase.auth.getSession();
          if (!session) return;

          // Get current term
          const termData = await gradeService.getCurrentTerm();
          setCurrentTerm(termData.name);

          // Get cadet's grades using the same service but with userId filter
          const gradesData = await gradeService.getGrades({
            userId: session.user.id
          });

          // Since we're filtering by user ID, we'll only get one record
          setGrades(gradesData[0] || null);
        } catch (error) {
          console.error('Error fetching cadet grades:', error);
          toast.error('Failed to load your grades');
        } finally {
          setLoading(false);
        }
      };

      fetchCadetGrades();
    }, [supabase]);

    if (loading) return <GradesPageSkeleton />;
    if (!grades) return <div>No grades found</div>;

    return (
      <div className="space-y-6">
        {/* Performance Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Object.entries(grades.grades).map(
            ([category, data]: [string, any]) => (
              <Card key={category}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {data?.score ? `${data.score.toFixed(1)}%` : 'N/A'}
                  </div>
                  {data?.updated_at && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Last updated:{' '}
                      {new Date(data.updated_at).toLocaleDateString()}
                    </p>
                  )}
                </CardContent>
              </Card>
            )
          )}
        </div>

        {/* Overall Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Overall Performance</CardTitle>
            <CardDescription>Your current term standing</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold mb-4">
              {calculateOverallScore(grades.grades)}%
            </div>
            <Progress
              value={calculateOverallScore(grades.grades)}
              className="h-2"
              indicatorClassName={getScoreColorClass(
                calculateOverallScore(grades.grades)
              )}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

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
        {/* <div className="flex gap-2">
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Grade
          </Button>
        </div> */}
      </div>

      {/* Filters */}
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <div className="space-y-2">
          <Label htmlFor="term">Term</Label>
          <Select
            value={currentTerm || 'all'}
            onValueChange={value => setCurrentTerm(value)}>
            <SelectTrigger id="term">
              <SelectValue placeholder="Select Term" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Terms</SelectItem>
              {/* Add terms from your terms array */}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="battalion">Battalion</Label>
          <Select
            value={selectedBattalion}
            onValueChange={value => setSelectedBattalion(value)}>
            <SelectTrigger id="battalion">
              <SelectValue placeholder="Select Battalion" />
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

        <div className="space-y-2">
          <Label htmlFor="course">Course</Label>
          <Select
            value={selectedCourse}
            onValueChange={value => setSelectedCourse(value)}>
            <SelectTrigger id="course">
              <SelectValue placeholder="Select Course" />
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

        {/* Add gender filter */}
        <div className="space-y-2">
          <Label htmlFor="gender">Gender</Label>
          <Select
            value={selectedGender}
            onValueChange={value => setSelectedGender(value)}>
            <SelectTrigger id="gender">
              <SelectValue placeholder="Select Gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Cards */}
      {/* <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Cadets</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredGrades.length}</div>
            <p className="text-xs text-muted-foreground">
              {selectedGender === 'all'
                ? 'All cadets'
                : selectedGender === 'male'
                ? 'Male cadets'
                : 'Female cadets'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Passing Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredGrades.length > 0
                ? `${Math.round(
                    (filteredGrades.filter(g => g.status === 'PASSED').length /
                      filteredGrades.length) *
                      100
                  )}%`
                : '0%'}
            </div>
            <Progress
              value={
                filteredGrades.length > 0
                  ? (filteredGrades.filter(g => g.status === 'PASSED').length /
                      filteredGrades.length) *
                    100
                  : 0
              }
              className="h-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredGrades.length > 0
                ? (
                    filteredGrades.reduce(
                      (acc, curr) => acc + (curr.overall_grade || 0),
                      0
                    ) / filteredGrades.length
                  ).toFixed(1)
                : '0.0'}
            </div>
            <p className="text-xs text-muted-foreground">
              Overall grade average
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Top Performers
            </CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredGrades.length > 0
                ? filteredGrades.filter(
                    g => g.equivalent && g.equivalent <= 1.5
                  ).length
                : '0'}
            </div>
            <p className="text-xs text-muted-foreground">
              Cadets with 1.5 or better
            </p>
          </CardContent>
        </Card>
      </div> */}

      {/* Main Content Tabs */}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-2xl">ROTC Grading</CardTitle>
            <CardDescription>
              Military Science grading system with attendance, aptitude, and
              exam components
            </CardDescription>
          </div>
          {/* <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print Report
            </Button>
          </div> */}
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="edit_grades">
            <TabsList className="mb-4">
              <TabsTrigger value="edit_grades">Edit Grades</TabsTrigger>
              {/* <TabsTrigger value="print_grades">Print/Export View</TabsTrigger> */}
            </TabsList>

            <TabsContent value="edit_grades">
              <ROTCGradesTable
                data={filteredGrades || []}
                onRefresh={fetchData}
                gender={selectedGender}
              />
              <div className="mt-4 p-4  rounded-md">
                <h3 className="font-medium mb-2">ROTC Grading System</h3>
                <div className="text-sm space-y-1">
                  <p>• Attendance (30%): 2.0 points per training day, max 30</p>
                  <p>• Aptitude (30%): (Merit - Demerit) / 100 × TTL</p>
                  <p>• Final Grade = Attendance + Aptitude</p>
                  <p>• Exam (40%): Exam raw score / 100 × 40</p>
                  <p>• Overall Grade = Final Grade + Exam</p>
                  <p>• Passing grade is 75 or higher (Equivalent ≤ 3.0)</p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="print_grades">
              <div
                ref={printRef}
                id="print-section"
                className="print-container">
                <h2 className="text-xl font-bold mb-4">
                  ROTC Grades - {currentTerm || 'All Terms'}
                </h2>
                {/* Use the processed grades from ROTCGradesTable */}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-center">NR</TableHead>
                      <TableHead>Names</TableHead>
                      <TableHead className="text-center">
                        ATTENDANCE 15 TRAINING DAYS
                      </TableHead>
                      <TableHead className="text-center">
                        ATTENDANCE 30%
                      </TableHead>
                      <TableHead className="text-center">MERIT</TableHead>
                      <TableHead className="text-center">DEMERIT</TableHead>
                      <TableHead className="text-center">TTL</TableHead>
                      <TableHead className="text-center">FINAL GRADE</TableHead>
                      <TableHead className="text-center">EXAM 40%</TableHead>
                      <TableHead className="text-center">
                        OVERALL GRADES
                      </TableHead>
                      <TableHead className="text-center">EQUIVALENT</TableHead>
                      <TableHead className="text-center">REMARKS</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {processedGrades.map((cadet, index) => (
                      <TableRow key={cadet.id}>
                        <TableCell className="text-center">
                          {index + 1}
                        </TableCell>
                        <TableCell>{cadet.student_name}</TableCell>
                        <TableCell className="text-center">
                          {cadet.attendance_days || 0}
                        </TableCell>
                        <TableCell className="text-center">
                          {cadet.attendance_score?.toFixed(1) || '0.0'}
                        </TableCell>
                        <TableCell className="text-center">
                          {cadet.merit || 100}
                        </TableCell>
                        <TableCell className="text-center">
                          {cadet.demerit || 0}
                        </TableCell>
                        <TableCell className="text-center">
                          {cadet.ttl?.toFixed(1) || '0.0'}
                        </TableCell>
                        <TableCell className="text-center">
                          {cadet.final_grade?.toFixed(1) || '0.0'}
                        </TableCell>
                        <TableCell className="text-center">
                          {cadet.exam_score?.toFixed(1) || '0.0'}
                        </TableCell>
                        <TableCell className="text-center">
                          {cadet.overall_grade?.toFixed(1) || '0.0'}
                        </TableCell>
                        <TableCell className="text-center">
                          {cadet.equivalent?.toFixed(1) || '5.0'}
                        </TableCell>
                        <TableCell className="text-center">
                          {cadet.status || 'FAILED'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="mt-4 flex justify-end">
                <Button onClick={handlePrint} className="mr-2">
                  <Printer className="mr-2 h-4 w-4" /> Print
                </Button>
                <Button onClick={handleExport} variant="outline">
                  <FileDown className="mr-2 h-4 w-4" /> Export CSV
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

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

function getScoreColor(score: number) {
  if (score >= 90) return 'bg-green-500';
  if (score >= 75) return 'bg-blue-500';
  return 'bg-red-500';
}

// ROTC grade calculation functions
const calculateROTCGrades = (grades: any[]): ROTCGrade[] => {
  return grades.map(grade => {
    // Extract academics, leadership, physical_fitness scores
    const academicsScore = grade.grades?.academics?.score || 0;
    const leadershipScore = grade.grades?.leadership?.score || 0;
    const physicalFitnessScore = grade.grades?.physical_fitness?.score || 0;

    // Convert to ROTC grading system
    const attendanceScore = academicsScore; // 30%

    // Merit is fixed at 100
    const merit = 100;

    // Demerit is 0 by default
    const demerit = 0;

    // TTL is calculated as Demerit * 0.3
    const ttl = demerit * 0.3;

    // Aptitude score calculation (using leadership score as a base)
    const aptitudeScore = leadershipScore;

    // Final grade is the sum of attendance and aptitude
    const finalGrade = attendanceScore + aptitudeScore;

    // Exam grade is calculated as Final Grade * 0.4
    const examGrade = finalGrade * 0.4;

    // Overall grade - sum of attendance, ttl and exam grade
    const overallGrade = attendanceScore + ttl + examGrade;

    // Calculate equivalent
    let equivalent = +(4 - (overallGrade - 60) * 0.05).toFixed(2);
    if (equivalent < 1.0) equivalent = 1.0;
    if (equivalent > 5.0) equivalent = 5.0;

    // Pass/fail status
    const status = equivalent <= 3.0 ? 'PASSED' : 'FAILED';

    return {
      id: grade.id,
      student_id: grade.id,
      student_name: grade.student_name,
      student_no: grade.student_no || 'N/A',
      attendance_score: attendanceScore,
      attendance_days: 0, // This will be updated based on attendance
      merit: 100,
      demerit: 0,
      ttl: 30,
      aptitude_score: aptitudeScore,
      final_grade: finalGrade,
      exam_score: physicalFitnessScore,
      overall_grade: overallGrade,
      equivalent: equivalent,
      status: status
    };
  });
};

// Add this function to calculate equivalent grade
function calculateEquivalent(overallGrade: number): number {
  if (overallGrade >= 97) return 1.0;
  if (overallGrade >= 94) return 1.25;
  if (overallGrade >= 91) return 1.5;
  if (overallGrade >= 88) return 1.75;
  if (overallGrade >= 85) return 2.0;
  if (overallGrade >= 82) return 2.25;
  if (overallGrade >= 79) return 2.5;
  if (overallGrade >= 76) return 2.75;
  if (overallGrade >= 75) return 3.0;
  return 5.0;
}

// Update the filterGrades function to work with both regular and ROTC grades
const filterGrades = grades => {
  if (!grades) return [];

  return grades.filter(grade => {
    // For search term
    const searchMatch =
      !searchTerm ||
      grade.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      grade.student_no?.toLowerCase().includes(searchTerm.toLowerCase());

    // For course
    let courseMatch = true;
    if (selectedCourse !== 'all') {
      if (gradingSystem === 'rotc') {
        // For ROTC grades
        courseMatch = grade.course === selectedCourse;
      } else {
        // For regular grades
        courseMatch = grade.profiles?.course === selectedCourse;
      }
    }

    // For battalion
    let battalionMatch = true;
    if (selectedBattalion !== 'all') {
      if (gradingSystem === 'rotc') {
        // For ROTC grades
        battalionMatch = grade.battalion_id === selectedBattalion;
      } else {
        // For regular grades
        battalionMatch = grade.profiles?.battalion_id === selectedBattalion;
      }
    }

    // For ROTC officers, only show grades from their battalion
    if (userRole === 'rotc_officer' && officerBattalionId) {
      if (gradingSystem === 'rotc') {
        // For ROTC grades
        return (
          searchMatch &&
          courseMatch &&
          grade.battalion_id === officerBattalionId
        );
      } else {
        // For regular grades
        return (
          searchMatch &&
          courseMatch &&
          grade.profiles?.battalion_id === officerBattalionId
        );
      }
    }

    return searchMatch && courseMatch && battalionMatch;
  });
};

// Add this mapping function to transform regular grades to ROTC format
const mapToRotcFormat = grades => {
  if (!grades?.length) return [];

  return grades.map(grade => {
    // Extract the academics, leadership, and physical fitness scores
    const academicsScore = grade.grades?.academics?.score || 0;
    const leadershipScore = grade.grades?.leadership?.score || 0;
    const physicalFitnessScore = grade.grades?.physical_fitness?.score || 0;

    // Calculate ROTC metrics
    // Base attendance on physical fitness score (as an example)
    const attendanceScore = Math.min(
      30,
      Math.round(physicalFitnessScore * 0.3)
    );

    // Aptitude score based on academics and leadership
    const aptitudeScore = Math.min(
      30,
      Math.round(((academicsScore + leadershipScore) / 2) * 0.3)
    );

    // Final grade is attendance + aptitude
    const finalGrade = attendanceScore + aptitudeScore;

    // Exam is physical fitness score (as placeholder)
    const examScore = physicalFitnessScore;

    // Overall is final grade + exam * 0.4
    const overallGrade = finalGrade + examScore * 0.4;

    // Calculate equivalent grade
    const equivalent = calculateEquivalent(overallGrade);

    return {
      id: grade.id,
      student_name: grade.student_name,
      student_no: grade.student_no || '',
      course: grade.profiles?.course || 'Unknown',
      battalion_id: grade.profiles?.battalion_id,
      term: grade.term || currentTerm,
      attendance_score: attendanceScore,
      attendance_days: Math.round(attendanceScore / 2), // 2 points per day
      merit: 100,
      demerit: 0,
      ttl: 30,
      aptitude_score: aptitudeScore,
      final_grade: finalGrade,
      exam_score: examScore,
      overall_grade: overallGrade,
      equivalent: equivalent,
      status: equivalent <= 3.0 ? 'PASSED' : 'FAILED',
      instructor_notes: '',
      created_at: grade.created_at,
      updated_at: grade.updated_at,
      // Flag that this is derived, not from ROTC grades table
      has_rotc_grades: false,
      // Keep the original grade structure for reference
      grades: grade.grades
    };
  });
};
