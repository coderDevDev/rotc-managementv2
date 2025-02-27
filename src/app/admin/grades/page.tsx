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
import { Plus, Download, Filter, Search } from 'lucide-react';
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
}

export default function GradesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [grades, setGrades] = useState<GroupedGrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedGrade, setSelectedGrade] = useState<GroupedGrade | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [currentTerm, setCurrentTerm] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [stats, setStats] = useState<GradeStats>({
    totalCadets: 0,
    averageScore: 0,
    passRate: 0,
    recentUpdates: 0,
    categoryAverages: {
      academics: 0,
      leadership: 0,
      physical_fitness: 0
    }
  });

  const [analyticsData, setAnalyticsData] = useState({
    performanceData: [],
    trendData: []
  });
  const [leaderboard, setLeaderboard] = useState<TermPerformance[]>([]);

  // Handle URL params for filtering
  useEffect(() => {
    const category = searchParams.get('category');
    if (category) {
      setSelectedCategory(category);
    }
  }, [searchParams]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [gradesData, termData] = await Promise.all([
        gradeService.getGrades(),
        gradeService.getCurrentTerm()
      ]);
      setGrades(gradesData);
      setCurrentTerm(termData);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load grades');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter grades based on search and category
  const filteredGrades = useMemo(() => {
    return grades.filter(grade => {
      const matchesSearch = searchQuery
        ? grade.student_name
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          grade.student_no.toLowerCase().includes(searchQuery.toLowerCase())
        : true;

      const matchesCategory = selectedCategory
        ? grade.grades.academics?.id === selectedCategory ||
          grade.grades.leadership?.id === selectedCategory ||
          grade.grades.physical_fitness?.id === selectedCategory
        : true;

      return matchesSearch && matchesCategory;
    });
  }, [grades, searchQuery, selectedCategory]);

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
      passRate: Math.round(
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
      categoryAverages: {
        academics: calculateCategoryAverage('academics'),
        leadership: calculateCategoryAverage('leadership'),
        physical_fitness: calculateCategoryAverage('physical_fitness')
      }
    });
  }, [grades]);

  // Helper function to calculate category averages
  const calculateCategoryAverage = (
    category: keyof typeof stats.categoryAverages
  ) => {
    const scores = grades
      .map(grade => grade.grades[category]?.score)
      .filter(Boolean);
    return scores.length
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;
  };

  // Calculate analytics data when grades change
  useEffect(() => {
    // Performance data
    const performanceData = [
      {
        category: 'Academics',
        average: stats.categoryAverages.academics,
        passing: grades.filter(g => (g.grades.academics?.score || 0) >= 75)
          .length,
        total: grades.length
      },
      {
        category: 'Leadership',
        average: stats.categoryAverages.leadership,
        passing: grades.filter(g => (g.grades.leadership?.score || 0) >= 75)
          .length,
        total: grades.length
      },
      {
        category: 'Physical Fitness',
        average: stats.categoryAverages.physical_fitness,
        passing: grades.filter(
          g => (g.grades.physical_fitness?.score || 0) >= 75
        ).length,
        total: grades.length
      }
    ];

    // Trend data (you'll need to fetch historical data)
    const trendData = [
      {
        term: currentTerm,
        academics: stats.categoryAverages.academics,
        leadership: stats.categoryAverages.leadership,
        physical_fitness: stats.categoryAverages.physical_fitness
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">Grades</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage and track cadet performance
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Grade
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total Cadets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCadets}</div>
            <p className="text-xs text-gray-500 mt-1">Active this term</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Average Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageScore}%</div>
            <p className="text-xs text-gray-500 mt-1">Across all categories</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Pass Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.passRate}%</div>
            <p className="text-xs text-gray-500 mt-1">Above passing grade</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="list" className="space-y-4">
        <TabsList className="bg-primary text-white">
          <TabsTrigger value="list">Cadet List</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          {/* Enhanced Filters */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search by name or student number..."
                className="pl-8"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Filter className="w-4 h-4 mr-2" />
                  {selectedCategory ? (
                    <span className="capitalize">
                      {selectedCategory.replace('_', ' ')}
                    </span>
                  ) : (
                    'Filter'
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setSelectedCategory(null)}>
                  All Categories
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setSelectedCategory('academics')}>
                  Academics
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setSelectedCategory('leadership')}>
                  Leadership
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setSelectedCategory('physical_fitness')}>
                  Physical Fitness
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Loading State */}
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            <GradesTable
              columns={columns}
              data={filteredGrades.map(grade => ({
                ...grade,
                onEdit: () => {
                  setSelectedGrade(grade);
                  setFormOpen(true);
                }
              }))}
            />
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
        onSuccess={() => {
          fetchData();
          setFormOpen(false);
          setSelectedGrade(null);
        }}
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
