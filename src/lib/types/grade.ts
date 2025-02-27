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
  student_id: string; // references profiles.id
  instructor_id: string; // references profiles.id
  category_id: GradeCategory;
  term: string;
  score: number;
  instructor_notes?: string;
  created_at: string;
  updated_at: string;
  student?: Profile; // joined from profiles
  instructor?: Profile; // joined from profiles
}

export interface TermPerformance {
  student_id: string;
  term: string;
  student_name: string;
  student_no: string;
  grades: {
    [K in GradeCategory]: {
      score: number;
      instructor_id: string;
      updated_at: string;
    };
  };
  overall_score: number;
  status: PerformanceStatus;
}

export interface GradeStats {
  totalCadets: number;
  averageScore: number;
  passRate: number;
  recentUpdates: number;
  categoryAverages: {
    [K in GradeCategory]: number;
  };
}
