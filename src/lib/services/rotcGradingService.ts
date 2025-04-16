import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { mockTerms, mockCadets } from '@/lib/utils/mockData';

const supabase = createClientComponentClient();

// Set to true to use mock data instead of Supabase
const USE_MOCK_DATA = true;

export const rotcGradingService = {
  /**
   * Get the current academic term
   */
  async getCurrentTerm() {
    if (USE_MOCK_DATA) {
      return {
        name: mockTerms[0].name,
        value: mockTerms[0].id
      };
    }

    try {
      // First try to get current term
      const { data, error } = await supabase
        .from('terms')
        .select('*')
        .eq('is_current', true)
        .single();

      if (!error && data) {
        return { name: data.name, value: data.id };
      }

      // If no current term, try to get the latest one
      const { data: latestTerm, error: latestError } = await supabase
        .from('terms')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!latestError && latestTerm) {
        return { name: latestTerm.name, value: latestTerm.id };
      }

      // If still no terms found, create a default term
      const currentYear = new Date().getFullYear();
      const defaultTermName = `SY${currentYear}-${currentYear + 1}`;

      const { data: newTerm, error: createError } = await supabase
        .from('terms')
        .insert([
          {
            name: defaultTermName,
            is_current: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ])
        .select()
        .single();

      if (createError) {
        console.error('Error creating default term:', createError);
        // Fall back to a temporary term object if datafbase insert fails
        return { name: defaultTermName, value: 'default' };
      }

      return { name: newTerm.name, value: newTerm.id };
    } catch (error) {
      console.error('Error getting current term:', error);
      // Ultimate fallback
      const defaultTermName = `SY${new Date().getFullYear()}-${
        new Date().getFullYear() + 1
      }`;
      return { name: defaultTermName, value: 'default' };
    }
  },

  /**
   * Get cadets for a specific course and term
   */
  async getCadets({ course, term }: { course: string; term: string }) {
    if (USE_MOCK_DATA) {
      // Filter mock cadets based on course prefix (ms1, ms2)
      return mockCadets.filter(cadet =>
        course.toLowerCase().startsWith(cadet.id.substring(cadet.id.length - 1))
      );
    }

    try {
      // First get the base cadet profiles
      let { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, full_name, student_no')
        .eq('role', 'cadet')
        .eq('course', course)
        .order('full_name');

      if (error) {
        console.error('Error fetching profiles:', error);
        return [];
      }

      // Handle case where no cadets are found
      if (!profiles || profiles.length === 0) {
        return []; // Return empty array instead of throwing error
      }

      // Get the grades for these cadets
      const { data: grades, error: gradesError } = await supabase
        .from('rotc_grades')
        .select('*')
        .eq('term', term)
        .in(
          'user_id',
          profiles.map(p => p.id)
        );

      if (gradesError) {
        console.error('Error fetching grades:', gradesError);
        // Continue with empty grades
      }

      // Get attendance records
      const { data: attendance, error: attendanceError } = await supabase
        .from('rotc_attendance')
        .select('*')
        .eq('term', term)
        .in(
          'user_id',
          profiles.map(p => p.id)
        );

      if (attendanceError) {
        console.error('Error fetching attendance:', attendanceError);
        // Continue with empty attendance
      }

      // Map cadets with their grades and attendance
      const cadetsData = profiles.map(profile => {
        const cadetGrades = grades?.find(g => g.user_id === profile.id) || null;
        const cadetAttendance =
          attendance?.filter(a => a.user_id === profile.id) || [];

        // Calculate attendance score (2.0 points per day, max 30%)
        const attendanceDays = cadetAttendance.length;
        const attendanceScore = Math.min(30, attendanceDays * 2);

        // Calculate aptitude score
        const merit = cadetGrades?.merit || 100;
        const demerit = cadetGrades?.demerit || 0;
        const ttl = cadetGrades?.ttl || 30;
        const aptitudeScore = ((merit - demerit) * ttl) / 100;

        // Calculate final grade (attendance + aptitude)
        const finalGrade = attendanceScore + aptitudeScore;

        // Get exam score
        const examScore = cadetGrades?.exam_score || 0;

        // Calculate overall grade
        const overallGrade = finalGrade * 0.6 + examScore * 0.4;

        // Calculate equivalent
        let equivalent;
        if (overallGrade >= 97) equivalent = 1.0;
        else if (overallGrade >= 94) equivalent = 1.25;
        else if (overallGrade >= 91) equivalent = 1.5;
        else if (overallGrade >= 88) equivalent = 1.75;
        else if (overallGrade >= 85) equivalent = 2.0;
        else if (overallGrade >= 82) equivalent = 2.25;
        else if (overallGrade >= 79) equivalent = 2.5;
        else if (overallGrade >= 76) equivalent = 2.75;
        else if (overallGrade >= 75) equivalent = 3.0;
        else equivalent = 5.0;

        // Determine status
        const status = equivalent < 5.0 ? 'PASSED' : 'FAILED';

        return {
          id: profile.id,
          name: profile.full_name,
          student_no: profile.student_no,
          attendance_days: attendanceDays,
          attendance_score: attendanceScore,
          merit: merit,
          demerit: demerit,
          ttl: ttl,
          aptitude_score: aptitudeScore,
          final_grade: finalGrade,
          exam_score: examScore,
          overall_grade: overallGrade,
          equivalent: equivalent,
          status: status,
          instructor_notes: cadetGrades?.instructor_notes || '',
          ...cadetGrades
        };
      });

      return cadetsData;
    } catch (error) {
      console.error('Error in getCadets:', error);
      return [];
    }
  },

  /**
   * Add a new grade entry
   */
  async addGrade(data: any) {
    try {
      const { error } = await supabase.from('rotc_grades').insert([
        {
          user_id: data.user_id,
          term: data.term,
          course_type: data.course_type,
          instructor_id: data.instructor_id,
          merit: data.merit,
          demerit: data.demerit,
          ttl: data.ttl,
          aptitude_score: data.aptitude_score,
          exam_score: data.exam_score,
          final_grade: data.final_grade,
          overall_grade: data.overall_grade,
          equivalent: data.equivalent,
          status: data.status,
          instructor_notes: data.instructor_notes
        }
      ]);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error adding grade:', error);
      throw error;
    }
  },

  /**
   * Update an existing grade entry
   */
  async updateGrade(userId: string, data: any) {
    try {
      const { error } = await supabase
        .from('rotc_grades')
        .update({
          merit: data.merit,
          demerit: data.demerit,
          ttl: data.ttl,
          aptitude_score: data.aptitude_score,
          exam_score: data.exam_score,
          final_grade: data.final_grade,
          overall_grade: data.overall_grade,
          equivalent: data.equivalent,
          status: data.status,
          instructor_notes: data.instructor_notes,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('term', data.term);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error updating grade:', error);
      throw error;
    }
  },

  /**
   * Record attendance for a cadet
   */
  async recordAttendance({
    userId,
    term,
    date,
    courseType,
    present,
    instructorId
  }: {
    userId: string;
    term: string;
    date: string;
    courseType: string;
    present: boolean;
    instructorId: string;
  }) {
    try {
      // Check if attendance already exists for this date
      const { data: existing, error: checkError } = await supabase
        .from('rotc_attendance')
        .select('id')
        .eq('user_id', userId)
        .eq('term', term)
        .eq('attendance_date', date)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existing) {
        // Update existing attendance
        if (present) {
          const { error } = await supabase
            .from('rotc_attendance')
            .update({
              present: present,
              updated_at: new Date().toISOString()
            })
            .eq('id', existing.id);

          if (error) throw error;
        } else {
          // Delete attendance record if not present
          const { error } = await supabase
            .from('rotc_attendance')
            .delete()
            .eq('id', existing.id);

          if (error) throw error;
        }
      } else if (present) {
        // Only insert if present (we don't store absences)
        const { error } = await supabase.from('rotc_attendance').insert([
          {
            user_id: userId,
            term,
            course_type: courseType,
            attendance_date: date,
            present,
            instructor_id: instructorId
          }
        ]);

        if (error) throw error;
      }

      return { success: true };
    } catch (error) {
      console.error('Error recording attendance:', error);
      throw error;
    }
  },

  /**
   * Get attendance records for a cadet
   */
  async getAttendanceRecords({
    userId,
    term
  }: {
    userId: string;
    term: string;
  }) {
    try {
      const { data, error } = await supabase
        .from('rotc_attendance')
        .select('*')
        .eq('user_id', userId)
        .eq('term', term)
        .order('attendance_date', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching attendance:', error);
      throw error;
    }
  },

  /**
   * Generate a report for a specific course and term
   */
  async generateReport(courseType: string, term: string) {
    try {
      // Fetch the cadets for this course and term
      const cadets = await this.getCadets({ course: courseType, term });

      // For now, we'll just return a JSON string - in a real app, you'd generate PDF/Excel
      return JSON.stringify(
        {
          courseType,
          term,
          generatedAt: new Date().toISOString(),
          cadets: cadets.map(cadet => ({
            name: cadet.name,
            student_no: cadet.student_no,
            attendance: cadet.attendance_score,
            aptitude: cadet.aptitude_score,
            final_grade: cadet.final_grade,
            exam: cadet.exam_score,
            overall: cadet.overall_grade,
            equivalent: cadet.equivalent,
            status: cadet.status
          }))
        },
        null,
        2
      );
    } catch (error) {
      console.error('Error generating report:', error);
      throw error;
    }
  }
};
