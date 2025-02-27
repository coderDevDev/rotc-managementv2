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

const columns: ColumnDef<GradeEntry>[] = [
  {
    accessorKey: 'cadet.full_name',
    header: 'Cadet',
    cell: ({ row }) => (
      <div>
        <div className="font-medium">{row.original.cadet?.full_name}</div>
        <div className="text-sm text-muted-foreground">
          {row.original.cadet?.student_no}
        </div>
      </div>
    )
  },
  {
    accessorKey: 'category_id',
    header: 'Category',
    cell: ({ row }) => (
      <span className="capitalize">
        {(row.getValue('category_id') as string).replace('_', ' ')}
      </span>
    )
  },
  {
    accessorKey: 'score',
    header: 'Score',
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className="bg-primary h-2.5 rounded-full"
            style={{ width: `${row.getValue('score')}%` }}
          />
        </div>
        <span className="text-sm font-medium">{row.getValue('score')}%</span>
      </div>
    )
  },
  {
    accessorKey: 'instructor.full_name',
    header: 'Instructor'
  },
  {
    accessorKey: 'instructor_notes',
    header: 'Notes'
  },
  {
    accessorKey: 'updated_at',
    header: 'Last Updated',
    cell: ({ row }) => {
      const date = new Date(row.getValue('updated_at'));
      return date.toLocaleDateString();
    }
  },
  {
    id: 'actions',
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setSelectedGrade(row.original);
            setFormOpen(true);
          }}>
          Edit
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive"
          onClick={() => {
            setSelectedGrade(row.original);
            setDeleteDialogOpen(true);
          }}>
          Delete
        </Button>
      </div>
    )
  }
];

export default function GradesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [grades, setGrades] = useState<GradeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedGrade, setSelectedGrade] = useState<GradeEntry | null>(null);
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
      const term = await gradeService.getCurrentTerm();
      setCurrentTerm(term);

      // Fetch all data for the current term
      const [gradesData, performanceData, statsData] = await Promise.all([
        gradeService.getGrades({ term }),
        gradeService.getTermPerformance({ term }),
        gradeService.getStats(term)
      ]);

      setGrades(gradesData);
      setLeaderboard(performanceData);
      setStats(statsData);

      // Prepare analytics data
      setAnalyticsData({
        performanceData: Object.entries(statsData.categoryAverages).map(
          ([category, average]) => ({
            category,
            average,
            count: gradesData.filter(g => g.category_id === category).length
          })
        ),
        trendData: [] // TODO: Implement trend data
      });
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
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
        ? grade.cadet?.full_name
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          grade.cadet?.student_no
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase())
        : true;

      const matchesCategory = selectedCategory
        ? grade.category_id === selectedCategory
        : true;

      return matchesSearch && matchesCategory;
    });
  }, [grades, searchQuery, selectedCategory]);

  // Actions
  const handleEdit = (grade: GradeEntry) => {
    setSelectedGrade(grade);
    setFormOpen(true);
  };

  const handleDelete = async (grade: GradeEntry) => {
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
          <h1 className="text-2xl font-semibold">Cadet Performance</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage and track cadet grades and evaluations
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button
            onClick={() => {
              setFormOpen(true);
            }}>
            <Plus className="w-4 h-4 mr-2" />
            Add Grade
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Recent Updates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.recentUpdates}</div>
            <p className="text-xs text-gray-500 mt-1">In the last 24 hours</p>
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
            <GradesTable columns={columns} data={filteredGrades} />
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
        onOpenChange={setFormOpen}
        grade={selectedGrade}
        onSuccess={() => {
          setFormOpen(false);
          setSelectedGrade(null);
          fetchData();
        }}
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
