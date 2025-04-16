export type GradeCategory = 'academics' | 'leadership' | 'physical_fitness';
export type PerformanceStatus =
  | 'excellent'
  | 'good'
  | 'pass'
  | 'needs_improvement';

// Profile type from your existing profiles table
interface Profile {
  id: string;
  full_name: string;
  student_no?: string;
  role: 'admin' | 'cadet';
  // ... other profile fields
}

export interface GradeEntry {
  id: string;
  student_id: string;
  instructor_id: string;
  category_id: 'academics' | 'leadership' | 'physical_fitness';
  term: string;
  score: number;
  instructor_notes?: string;
  created_at: string;
  updated_at: string;
  profile?: any;
  instructor?: any;
  category?: any;
  grades?: {
    academics?: { id: string; score: number } | null;
    leadership?: { id: string; score: number } | null;
    physical_fitness?: { id: string; score: number } | null;
  };
}

export interface GroupedGrade {
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
  battalion?: {
    id: string;
    name: string;
  };
}

export interface TermPerformance {
  student_id: string;
  student_name: string;
  student_no: string;
  term: string;
  grades: {
    academics: { id: string; score: number } | null;
    leadership: { id: string; score: number } | null;
    physical_fitness: { id: string; score: number } | null;
  };
  overall_score: number;
  status: string;
}

export interface GradeStats {
  totalCadets: number;
  averageScore: number;
  passingRate: number;
  categoryBreakdown: {
    academics: { total: number; passing: number; average: number };
    leadership: { total: number; passing: number; average: number };
    physical_fitness: { total: number; passing: number; average: number };
  };
  coursePerformance: Record<string, { total: number; average: number }>;
  recentUpdates?: number;
}

export interface CadetGrade {
  id: string;
  student_name: string;
  student_no: string;
  term: string;
  grades: {
    academics: { id: string; score: number } | null;
    leadership: { id: string; score: number } | null;
    physical_fitness: { id: string; score: number } | null;
  };
  overall_score: number;
  status: string;
}
