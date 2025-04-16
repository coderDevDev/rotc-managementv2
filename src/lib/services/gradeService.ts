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

  // Get grades with optional filters
  async getGrades(filters?: {
    term?: string;
    userId?: string;
    gender?: string;
  }) {
    try {
      let query = supabase.from('term_grades').select(`
        *,
        profile:user_id (
          id,
          full_name,
          student_no,
          course,
          gender,
          battalion_members (
            battalion_id,
            battalions (
              id,
              name
            )
          )
        ),
        category:category_id (
          id,
          name
        )
      `);

      // Apply filters
      if (filters?.term && filters.term !== 'all') {
        query = query.eq('term', filters.term);
      }
      if (filters?.userId) {
        query = query.eq('user_id', filters.userId);
      }

      // Add gender filter at the database level
      if (filters?.gender && filters.gender !== 'all') {
        // Filter by the gender field on the profile
        query = query.eq('profile.gender', filters.gender);
      }

      const { data: grades, error } = await query;
      if (error) throw error;

      // Group grades by student
      const groupedGrades = grades.reduce((acc: any, grade: any) => {
        if (!acc[grade.user_id]) {
          const battalionInfo =
            grade.profile.battalion_members?.[0]?.battalions;

          acc[grade.user_id] = {
            id: grade.user_id,
            student_name: grade.profile.full_name,
            student_no: grade.profile.student_no,
            course: grade.profile.course,
            battalion: battalionInfo,
            battalion_id: grade.profile.battalion_members?.[0]?.battalion_id,
            term: grade.term,
            grades: {
              academics: null,
              leadership: null,
              physical_fitness: null
            },
            created_at: grade.created_at,
            updated_at: grade.updated_at,
            gender: grade.profile.gender
          };
        }

        // Map the category name correctly
        let categoryKey = '';
        switch (grade.category.name.toLowerCase()) {
          case 'academics':
            categoryKey = 'academics';
            break;
          case 'leadership':
            categoryKey = 'leadership';
            break;
          case 'physical fitness':
            categoryKey = 'physical_fitness';
            break;
          default:
            categoryKey = grade.category.name.toLowerCase();
        }

        acc[grade.user_id].grades[categoryKey] = {
          id: grade.id,
          score: grade.score,
          updated_at: grade.updated_at,
          gender: grade.profile.gender
        };

        return acc;
      }, {});

      return Object.values(groupedGrades);
    } catch (error) {
      console.error('Error in getGrades:', error);
      throw error;
    }
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

  // Update grades for a student
  async updateGrades(
    userId: string,
    data: {
      academics?: { score: number };
      leadership?: { score: number };
      physical_fitness?: { score: number };
      instructor_notes?: string;
      term?: string;
    }
  ) {
    try {
      const updates = [];

      // Get current grades
      const { data: currentGrades, error: gradesError } = await supabase
        .from('term_grades')
        .select('id, category_id')
        .eq('user_id', userId)
        .eq('term', data.term);

      if (gradesError) throw gradesError;

      // Update each category if it exists
      for (const grade of currentGrades) {
        const categoryName = grade.category_id.toLowerCase();
        let score;

        switch (categoryName) {
          case 'academics':
            score = data.academics?.score;
            break;
          case 'leadership':
            score = data.leadership?.score;
            break;
          case 'physical fitness':
            score = data.physical_fitness?.score;
            break;
        }

        if (score !== undefined) {
          updates.push(
            supabase
              .from('term_grades')
              .update({
                score,
                updated_at: new Date().toISOString(),
                instructor_notes: data.instructor_notes
              })
              .eq('id', grade.id)
          );
        }
      }

      await Promise.all(updates);
      return true;
    } catch (error) {
      console.error('Error updating grades:', error);
      throw error;
    }
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
    const semester = month <= 6 ? '1st' : '2nd';
    const schoolYear =
      month <= 6 ? `${year - 1}-${year}` : `${year}-${year + 1}`;

    return {
      name: `${semester} Semester ${schoolYear}`,
      value: `${year}-${semester === '1st' ? '1' : '2'}`
    };
  },

  // Add to existing gradeService
  async getTerms(): Promise<string[]> {
    const { data, error } = await supabase
      .from('term_grades')
      .select('term')
      .order('term', { ascending: true });

    if (error) throw error;

    // Get unique terms
    return [...new Set(data.map(g => g.term))];
  },

  async getCadetGrades(userId: string) {
    try {
      // Get all grades without foreign key relationships
      const { data: grades, error } = await supabase
        .from('grade_items')
        .select(
          `
          id,
          term,
          score,
          updated_at,
          instructor_id,
          category_id
        `
        )
        .eq('user_id', userId)
        .order('term', { ascending: false });

      if (error) throw error;

      // Get categories for mapping
      const { data: categories } = await supabase
        .from('grade_categories')
        .select('id, name');

      // Create category map
      const categoryMap = categories?.reduce((acc, cat) => {
        acc[cat.id] = cat.name.toLowerCase();
        return acc;
      }, {});

      // Group grades by term
      const termGrades = grades.reduce((acc, grade) => {
        if (!acc[grade.term]) {
          acc[grade.term] = {
            term: grade.term,
            grades: {
              academics: null,
              leadership: null,
              physical_fitness: null
            }
          };
        }

        const category = categoryMap[grade.category_id];
        if (category) {
          acc[grade.term].grades[category] = {
            score: grade.score,
            updated_at: grade.updated_at,
            instructor_id: grade.instructor_id
          };
        }

        return acc;
      }, {});

      return Object.values(termGrades).map((term: any) => ({
        ...term,
        status: this.determineStatus(term.grades)
      }));
    } catch (error) {
      console.error('Error fetching cadet grades history:', error);
      throw error;
    }
  },

  async getCurrentTermGrades(userId: string) {
    try {
      // Get grades for the current term
      const { data: grades, error } = await supabase
        .from('term_grades')
        .select(
          `
          *,
          category:category_id (
            name
          )
        `
        )
        .eq('user_id', userId);

      if (error) throw error;

      // Format grades into the expected structure
      const formattedGrades = {
        grades: {},
        overall_score: 0,
        status: 'pending',
        term_history: []
      };

      // Group current term grades by category
      grades.forEach(grade => {
        const categoryName = grade.category.name.toLowerCase();
        formattedGrades.grades[categoryName] = {
          id: grade.id,
          score: grade.score,
          updated_at: grade.updated_at
        };
      });

      // Calculate overall score
      const scores = Object.values(formattedGrades.grades).map(
        (g: any) => g.score
      );
      if (scores.length > 0) {
        formattedGrades.overall_score =
          scores.reduce((a, b) => a + b, 0) / scores.length;
        formattedGrades.status =
          formattedGrades.overall_score >= 75 ? 'passing' : 'failing';
      }

      // Get term history
      const { data: termHistory } = await supabase
        .from('term_grades')
        .select(
          `
          term,
          category:category_id (
            name
          ),
          score,
          updated_at
        `
        )
        .eq('user_id', userId)
        .order('term', { ascending: false });

      if (termHistory) {
        // Group term history by term
        const historyByTerm = termHistory.reduce((acc, grade) => {
          if (!acc[grade.term]) {
            acc[grade.term] = {
              term: grade.term,
              grades: {
                academics: null,
                leadership: null,
                physical_fitness: null
              },
              status: 'pending'
            };
          }

          const categoryName = grade.category.name.toLowerCase();
          acc[grade.term].grades[categoryName] = {
            score: grade.score,
            updated_at: grade.updated_at
          };

          // Calculate term status
          const termScores = Object.values(acc[grade.term].grades)
            .filter(g => g)
            .map((g: any) => g.score);

          if (termScores.length > 0) {
            const average =
              termScores.reduce((a, b) => a + b, 0) / termScores.length;
            acc[grade.term].status = average >= 75 ? 'passing' : 'failing';
          }

          return acc;
        }, {});

        formattedGrades.term_history = Object.values(historyByTerm);
      }

      return formattedGrades;
    } catch (error) {
      console.error('Error fetching cadet grades:', error);
      throw error;
    }
  },

  // Helper function to determine status based on score
  determineStatus(score: number): string {
    if (score >= 90) return 'excellent';
    if (score >= 85) return 'good';
    if (score >= 75) return 'pass';
    return 'needs_improvement';
  },

  async getPerformanceStats(userId?: string) {
    try {
      const currentTerm = await this.getCurrentTerm();

      // Get term grades first
      let query = supabase
        .from('term_grades')
        .select(
          `
          id,
          term,
          user_id,
          academics_id,
          leadership_id,
          physical_fitness_id,
          profiles!term_grades_user_id_fkey (
            full_name,
            student_no,
            course
          )
        `
        )
        .eq('term', currentTerm);

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data: termGrades, error: termError } = await query;
      if (termError) throw termError;

      // Get all grade categories
      const { data: gradeCategories, error: gradesError } = await supabase
        .from('grade_categories')
        .select('*')
        .in(
          'id',
          termGrades
            .flatMap(t => [
              t.academics_id,
              t.leadership_id,
              t.physical_fitness_id
            ])
            .filter(Boolean)
        );

      if (gradesError) throw gradesError;

      // Transform the data
      const grades = termGrades.map(term => ({
        ...term,
        academics: gradeCategories.find(g => g.id === term.academics_id),
        leadership: gradeCategories.find(g => g.id === term.leadership_id),
        physical_fitness: gradeCategories.find(
          g => g.id === term.physical_fitness_id
        )
      }));

      // Calculate statistics
      const stats = {
        totalCadets: 0,
        averageScore: 0,
        passingRate: 0,
        categoryBreakdown: {
          academics: { total: 0, passing: 0, average: 0 },
          leadership: { total: 0, passing: 0, average: 0 },
          physical_fitness: { total: 0, passing: 0, average: 0 }
        },
        coursePerformance: {} as Record<
          string,
          { total: number; average: number }
        >
      };

      if (grades?.length) {
        grades.forEach(grade => {
          // Process academics
          if (grade.academics.value !== null) {
            stats.categoryBreakdown.academics.total++;
            if (grade.academics.value >= 75) {
              stats.categoryBreakdown.academics.passing++;
            }
            stats.categoryBreakdown.academics.average += grade.academics.value;
          }

          // Process leadership
          if (grade.leadership.value !== null) {
            stats.categoryBreakdown.leadership.total++;
            if (grade.leadership.value >= 75) {
              stats.categoryBreakdown.leadership.passing++;
            }
            stats.categoryBreakdown.leadership.average +=
              grade.leadership.value;
          }

          // Process physical fitness
          if (grade.physical_fitness.value !== null) {
            stats.categoryBreakdown.physical_fitness.total++;
            if (grade.physical_fitness.value >= 75) {
              stats.categoryBreakdown.physical_fitness.passing++;
            }
            stats.categoryBreakdown.physical_fitness.average +=
              grade.physical_fitness.value;
          }

          // Process course performance
          if (grade.profiles?.course) {
            const course = grade.profiles.course;
            if (!stats.coursePerformance[course]) {
              stats.coursePerformance[course] = { total: 0, average: 0 };
            }

            // Calculate overall score for this grade
            const scores = [
              grade.academics.value || 0,
              grade.leadership.value || 0,
              grade.physical_fitness.value || 0
            ].filter(score => score > 0);

            if (scores.length > 0) {
              const average = Math.round(
                scores.reduce((a, b) => a + b, 0) / scores.length
              );
              stats.coursePerformance[course].total++;
              stats.coursePerformance[course].average += average;
            }
          }
        });

        // Calculate final averages
        Object.values(stats.categoryBreakdown).forEach(cat => {
          if (cat.total > 0) {
            cat.average = Math.round(cat.average / cat.total);
          }
        });

        Object.values(stats.coursePerformance).forEach(perf => {
          if (perf.total > 0) {
            perf.average = Math.round(perf.average / perf.total);
          }
        });

        // Calculate overall stats
        stats.totalCadets = userId ? 1 : grades.length;

        const validGrades = grades.filter(
          g =>
            g.academics.value !== null &&
            g.leadership.value !== null &&
            g.physical_fitness.value !== null
        );

        if (validGrades.length > 0) {
          const totalScores = validGrades.map(g => {
            const scores = [
              g.academics.value || 0,
              g.leadership.value || 0,
              g.physical_fitness.value || 0
            ].filter(score => score > 0);
            return scores.length
              ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
              : 0;
          });

          stats.averageScore = Math.round(
            totalScores.reduce((a, b) => a + b, 0) / validGrades.length
          );

          stats.passingRate = Math.round(
            (totalScores.filter(score => score >= 75).length /
              validGrades.length) *
              100
          );
        }
      }

      return stats;
    } catch (error) {
      console.error('Error fetching performance stats:', error);
      throw error;
    }
  },

  // Update grade entry
  async updateGrade(
    gradeId: string,
    data: {
      score: number;
      instructor_notes?: string;
    }
  ) {
    try {
      const { data: updatedGrade, error } = await supabase
        .from('term_grades')
        .update({
          score: data.score,
          instructor_notes: data.instructor_notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', gradeId)
        .select()
        .single();

      if (error) throw error;
      return updatedGrade;
    } catch (error) {
      console.error('Error updating grade:', error);
      throw error;
    }
  },

  /**
   * Delete a grade entry by its ID
   */
  async deleteGrade(gradeId: string): Promise<void> {
    const { error } = await supabase.from('grades').delete().eq('id', gradeId);

    if (error) throw error;
  },

  /**
   * Export grades for a specific term as CSV
   */
  async exportGrades(
    term: string | { name: string; value: string }
  ): Promise<string> {
    const termName = typeof term === 'string' ? term : term.name;
    const gradesData = await this.getGrades({ term: termName });

    // Create CSV header
    const headers = [
      'Student ID',
      'Student Name',
      'Student No',
      'Term',
      'Academics',
      'Leadership',
      'Physical Fitness',
      'Overall',
      'Last Updated'
    ];

    // Convert grades to CSV rows
    const rows = gradesData.map((grade: any) => [
      grade.id,
      grade.student_name,
      grade.student_no,
      grade.term,
      grade.grades.academics?.score || 'N/A',
      grade.grades.leadership?.score || 'N/A',
      grade.grades.physical_fitness?.score || 'N/A',
      calculateOverallScore(grade.grades),
      new Date(grade.updated_at).toLocaleDateString()
    ]);

    // Combine header and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    return csvContent;
  },

  // Helper function to calculate overall score
  calculateOverallScore(grades: any) {
    const scores = Object.values(grades)
      .filter((g: any) => g?.score)
      .map((g: any) => g.score);

    if (!scores.length) return 'N/A';
    return (
      scores.reduce((a: number, b: number) => a + b, 0) / scores.length
    ).toFixed(1);
  }
};
