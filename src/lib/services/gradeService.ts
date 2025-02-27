import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import {
  GradeEntry,
  TermPerformance,
  GradeStats,
  GradeCategory
} from '../types/grade';

const supabase = createClientComponentClient();

export const gradeService = {
  // Get grade categories with their weights
  async getCategories() {
    const { data, error } = await supabase
      .from('grade_categories')
      .select('*')
      .order('id');

    if (error) throw error;
    return data;
  },

  // Get grades with filters and sorting
  async getGrades(filters?: {
    user_id?: string;
    term?: string;
    category_id?: GradeCategory;
    battalion_id?: string;
  }) {
    let query = supabase
      .from('term_grades')
      .select(
        `
        *,
        profile:user_id (
          id,
          full_name,
          student_no,
          role
        ),
        instructor:profiles!term_grades_instructor_id_fkey (
          id,
          full_name,
          role
        ),
        category:category_id (
          id,
          name,
          weight
        ),
        battalion:battalion_members!inner (
          battalion_id,
          battalion (
            name
          )
        )
      `
      )
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters?.user_id) {
      query = query.eq('user_id', filters.user_id);
    }
    if (filters?.term) {
      query = query.eq('term', filters.term);
    }
    if (filters?.category_id) {
      query = query.eq('category_id', filters.category_id);
    }
    if (filters?.battalion_id) {
      query = query.eq('battalion.battalion_id', filters.battalion_id);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as GradeEntry[];
  },

  // Get students (cadets) from profiles
  async getStudents(battalion_id?: string) {
    let query = supabase
      .from('profiles')
      .select(
        `
        id,
        full_name,
        student_no,
        battalion:battalion_members!inner (
          battalion_id,
          battalion (
            name
          )
        )
      `
      )
      .eq('role', 'cadet')
      .order('full_name');

    if (battalion_id) {
      query = query.eq('battalion.battalion_id', battalion_id);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  // Add new grade entry
  async addGrade(
    data: Omit<
      GradeEntry,
      'id' | 'created_at' | 'updated_at' | 'profile' | 'instructor' | 'category'
    >
  ) {
    // Check if grade already exists for this user, category and term
    const { data: existing } = await supabase
      .from('term_grades')
      .select('id')
      .match({
        user_id: data.user_id,
        category_id: data.category_id,
        term: data.term
      })
      .single();

    if (existing) {
      throw new Error(
        'Grade already exists for this category in the current term'
      );
    }

    const { data: grade, error } = await supabase
      .from('term_grades')
      .insert([
        {
          ...data,
          updated_at: new Date().toISOString()
        }
      ])
      .select(
        `
        *,
        profile:user_id (
          id,
          full_name,
          student_no,
          role
        ),
        instructor:profiles!term_grades_instructor_id_fkey (
          id,
          full_name,
          role
        ),
        category:category_id (
          id,
          name,
          weight
        )
      `
      )
      .single();

    if (error) throw error;
    return grade as GradeEntry;
  },

  // Update existing grade
  async updateGrade(
    id: string,
    data: Partial<
      Omit<
        GradeEntry,
        | 'id'
        | 'created_at'
        | 'updated_at'
        | 'profile'
        | 'instructor'
        | 'category'
      >
    >
  ) {
    const { data: grade, error } = await supabase
      .from('term_grades')
      .update({
        ...data,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(
        `
        *,
        profile:user_id (
          id,
          full_name,
          student_no,
          role
        ),
        instructor:profiles!term_grades_instructor_id_fkey (
          id,
          full_name,
          role
        ),
        category:category_id (
          id,
          name,
          weight
        )
      `
      )
      .single();

    if (error) throw error;
    return grade as GradeEntry;
  },

  // Delete grade entry
  async deleteGrade(id: string) {
    const { error } = await supabase.from('term_grades').delete().eq('id', id);
    if (error) throw error;
  },

  // Get term performance data
  async getTermPerformance(filters?: {
    user_id?: string;
    term?: string;
    battalion_id?: string;
  }) {
    let query = supabase
      .from('term_grades')
      .select(
        `
        *,
        battalion:battalion_members!inner(
          battalion_id
        )
      `
      )
      .order('overall_score', { ascending: false });

    if (filters?.user_id) {
      query = query.eq('user_id', filters.user_id);
    }
    if (filters?.term) {
      query = query.eq('term', filters.term);
    }
    if (filters?.battalion_id) {
      query = query.eq('battalion.battalion_id', filters.battalion_id);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as TermPerformance[];
  },

  // Get current academic term
  async getCurrentTerm() {
    const year = new Date().getFullYear();
    const month = new Date().getMonth() + 1;
    const term = month <= 6 ? '1' : '2';
    return `${year}-${term}`;
  },

  // Get grade statistics
  async getStats(term: string, battalion_id?: string): Promise<GradeStats> {
    const { data, error } = await supabase.rpc('get_grade_stats', {
      term_param: term,
      battalion_param: battalion_id
    });

    if (error) throw error;
    return data;
  },

  // Export grades to CSV
  async exportGrades(term: string, battalion_id?: string): Promise<string> {
    let query = supabase
      .from('term_grades')
      .select(
        `
        *,
        profile:user_id (
          full_name,
          student_no
        ),
        instructor:profiles!term_grades_instructor_id_fkey (
          full_name
        ),
        category:category_id (
          name
        ),
        battalion:battalion_members!inner(
          battalion (
            name
          )
        )
      `
      )
      .eq('term', term)
      .order('created_at', { ascending: true });

    if (battalion_id) {
      query = query.eq('battalion.battalion_id', battalion_id);
    }

    const { data: grades, error } = await query;
    if (error) throw error;

    // Convert to CSV format
    const headers = [
      'Student No.',
      'Student Name',
      'Battalion',
      'Category',
      'Score',
      'Instructor',
      'Notes',
      'Date'
    ];

    const rows = grades.map(grade => [
      grade.profile?.student_no || '',
      grade.profile?.full_name || '',
      grade.battalion?.battalion?.name || '',
      grade.category?.name || grade.category_id,
      grade.score,
      grade.instructor?.full_name || '',
      grade.instructor_notes || '',
      new Date(grade.created_at).toLocaleDateString()
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    return csvContent;
  }
};
