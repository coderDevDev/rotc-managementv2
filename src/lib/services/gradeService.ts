import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import {
  GradeEntry,
  GradeCategory,
  TermPerformance,
  GradeStats
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

  // Get grades grouped by student
  async getGrades(filters?: { term?: string }) {
    let query = supabase.from('term_grades').select(`
        *,
        profile:user_id (
          id,
          full_name,
          student_no
        ),
        instructor:instructor_id (
          id,
          full_name
        ),
        category:category_id (
          id,
          name,
          weight
        )
      `);

    if (filters?.term) {
      query = query.eq('term', filters.term);
    }

    const { data: grades, error } = await query;

    if (error) throw error;

    // Group grades by student
    const groupedGrades = grades.reduce((acc, grade) => {
      if (!acc[grade.user_id]) {
        acc[grade.user_id] = {
          id: grade.user_id,
          student_name: grade.profile.full_name,
          student_no: grade.profile.student_no,
          term: grade.term,
          grades: {
            academics: null,
            leadership: null,
            physical_fitness: null
          },
          instructor_notes: grade.instructor_notes,
          created_at: grade.created_at,
          updated_at: grade.updated_at
        };
      }

      acc[grade.user_id].grades[grade.category_id] = {
        id: grade.id,
        score: grade.score,
        instructor_id: grade.instructor_id,
        instructor_name: grade.instructor.full_name,
        updated_at: grade.updated_at
      };

      return acc;
    }, {});

    return Object.values(groupedGrades);
  },

  // Get students for grade entry
  async getStudents() {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, student_no')
      .eq('role', 'cadet')
      .order('full_name');

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
      .insert([data])
      .select()
      .single();

    if (error) throw error;
    return grade;
  },

  // Update grade entries for a student
  async updateGrades(
    studentId: string,
    data: {
      academics?: { score: number; instructor_id: string };
      leadership?: { score: number; instructor_id: string };
      physical_fitness?: { score: number; instructor_id: string };
      instructor_notes?: string;
      term: string;
    }
  ) {
    const updates = [];

    if (data.academics) {
      updates.push(
        supabase
          .from('term_grades')
          .update({
            score: data.academics.score,
            instructor_id: data.academics.instructor_id,
            instructor_notes: data.instructor_notes
          })
          .match({
            user_id: studentId,
            category_id: 'academics',
            term: data.term
          })
      );
    }

    if (data.leadership) {
      updates.push(
        supabase
          .from('term_grades')
          .update({
            score: data.leadership.score,
            instructor_id: data.leadership.instructor_id,
            instructor_notes: data.instructor_notes
          })
          .match({
            user_id: studentId,
            category_id: 'leadership',
            term: data.term
          })
      );
    }

    if (data.physical_fitness) {
      updates.push(
        supabase
          .from('term_grades')
          .update({
            score: data.physical_fitness.score,
            instructor_id: data.physical_fitness.instructor_id,
            instructor_notes: data.instructor_notes
          })
          .match({
            user_id: studentId,
            category_id: 'physical_fitness',
            term: data.term
          })
      );
    }

    await Promise.all(updates);
  },

  // Get grade statistics
  async getStats(term?: string): Promise<GradeStats> {
    const query = supabase.from('term_grades').select(
      `
        *,
        profile:user_id (
          id,
          full_name,
          student_no
        ),
        category:category_id (
          id,
          name,
          weight
        )
      `
    );

    if (term) {
      query.eq('term', term);
    }

    const { data: grades, error } = await query;

    if (error) throw error;

    // Calculate statistics
    const totalCadets = new Set(grades.map(g => g.user_id)).size;
    const averageScore =
      grades.reduce((sum, g) => sum + g.score, 0) / grades.length || 0;

    const passingGrades = grades.filter(g => g.score >= 75);
    const passRate = (passingGrades.length / grades.length) * 100 || 0;

    const recentUpdates = grades.filter(
      g =>
        new Date(g.updated_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    ).length;

    // Calculate category averages
    const categoryAverages = {
      academics: 0,
      leadership: 0,
      physical_fitness: 0
    };

    Object.keys(categoryAverages).forEach(category => {
      const categoryGrades = grades.filter(g => g.category_id === category);
      categoryAverages[category as GradeCategory] =
        categoryGrades.reduce((sum, g) => sum + g.score, 0) /
          categoryGrades.length || 0;
    });

    return {
      totalCadets,
      averageScore,
      passRate,
      recentUpdates,
      categoryAverages
    };
  },

  // Get term performance for a student
  async getTermPerformance(
    userId: string | undefined,
    term: string | undefined
  ): Promise<TermPerformance | null> {
    // Return null if we don't have required params
    if (!userId || !term) {
      return null;
    }

    const { data: grades, error } = await supabase
      .from('term_grades')
      .select(
        `
        *,
        profile:user_id (
          id,
          full_name,
          student_no
        ),
        category:category_id (
          id,
          name,
          weight
        )
      `
      )
      .eq('user_id', userId)
      .eq('term', term);

    if (error) throw error;

    // Return null if no grades found
    if (!grades || grades.length === 0) {
      return null;
    }

    // Calculate overall score and status
    const categoryScores = {
      academics: 0,
      leadership: 0,
      physical_fitness: 0
    };

    grades.forEach(grade => {
      categoryScores[grade.category_id as keyof typeof categoryScores] =
        grade.score;
    });

    const overallScore =
      Object.values(categoryScores).reduce((a, b) => a + b, 0) / 3;

    let status: TermPerformance['status'];
    if (overallScore >= 90) status = 'excellent';
    else if (overallScore >= 80) status = 'good';
    else if (overallScore >= 75) status = 'pass';
    else status = 'needs_improvement';

    return {
      student_id: userId,
      term,
      student_name: grades[0].profile.full_name,
      student_no: grades[0].profile.student_no || '',
      grades: {
        academics: {
          score: categoryScores.academics,
          instructor_id:
            grades.find(g => g.category_id === 'academics')?.instructor_id ||
            '',
          updated_at:
            grades.find(g => g.category_id === 'academics')?.updated_at || ''
        },
        leadership: {
          score: categoryScores.leadership,
          instructor_id:
            grades.find(g => g.category_id === 'leadership')?.instructor_id ||
            '',
          updated_at:
            grades.find(g => g.category_id === 'leadership')?.updated_at || ''
        },
        physical_fitness: {
          score: categoryScores.physical_fitness,
          instructor_id:
            grades.find(g => g.category_id === 'physical_fitness')
              ?.instructor_id || '',
          updated_at:
            grades.find(g => g.category_id === 'physical_fitness')
              ?.updated_at || ''
        }
      },
      overall_score: overallScore,
      status
    };
  },

  // Get current academic term
  async getCurrentTerm() {
    const year = new Date().getFullYear();
    const month = new Date().getMonth() + 1;
    const term = month <= 6 ? '1' : '2';
    return `${year}-${term}`;
  }
};
