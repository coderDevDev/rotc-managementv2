import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

const supabase = createClientComponentClient();

export const rotcGradeService = {
  // Get ROTC grades for all students or a specific student
  async getGrades(options?: { userId?: string; term?: string }) {
    try {
      // Start by getting all active cadets from profiles

      // LEFT JOIN enrollments table to get the student_no
      // in enrollments i have profile_id how to left join it
      // LEFT JOIN enrollments table to get the student_no
      // in enrollments i have profile_id how to left join it
      // LEFT JOIN enrollments table to get the student_no
      // in enrollments i have profile_id how to left join it
      // LEFT JOIN enrollments table to get the student_no
      // in enrollments i have profile_id how to left join it

      let query = supabase.from('profiles').select(
        `
          id,
          full_name,
          student_no,
          course,
          role,
          battalions (id, name), 
          enrollments!left (
            profile_id,
            student_no
          ),
          rotc_grades!left (
            id,
            term,
            attendance_score,
            attendance_days,
            merit,
            demerit,
            ttl,
            aptitude_score,
            exam_score,
            final_grade,
            overall_grade,
            equivalent,
            status,
            instructor_notes,
            created_at,
            updated_at
          )
        `
      );
      // .eq('role', 'cadet');

      if (options?.userId) {
        query = query.eq('id', options.userId);
      }

      if (options?.term) {
        query = query.eq('rotc_grades.term', options.term);
      }

      const { data, error } = await query;

      if (error) throw error;

      // if (options?.userId === 'f40b016e-9e2e-45ee-a678-5f7c788437fc') {
      //   console.log({ data });
      // }

      console.log({ data });
      // Map the data to match the expected format
      return data.map(profile => {
        // Get the ROTC grade for this cadet, if it exists
        const rotcGrade = profile.rotc_grades?.[0] || null;

        return {
          id: profile.id,
          student_name: profile.full_name,
          student_no:
            profile.enrollments.find(e => e.profile_id === profile.id)
              ?.student_no || '',
          course: profile.course || 'Unknown',
          battalion_id: profile.battalions?.[0]?.id,
          battalion_name: profile.battalions?.[0]?.name,
          term: options?.term || 'Current Term',
          // Include ROTC grade data if it exists
          attendance_score: rotcGrade?.attendance_score || 0,
          attendance_days: rotcGrade?.attendance_days || 0,
          merit: rotcGrade?.merit || 100,
          demerit: rotcGrade?.demerit || 0,
          ttl: rotcGrade?.ttl || 0,
          aptitude_score: rotcGrade?.aptitude_score || 0,
          exam_score: rotcGrade?.exam_score || 0,
          final_grade: rotcGrade?.final_grade || 0,
          overall_grade: rotcGrade?.overall_grade || 0,
          equivalent: rotcGrade?.equivalent || 0,
          status: rotcGrade?.status || 'PENDING',
          instructor_notes: rotcGrade?.instructor_notes || '',
          created_at:
            rotcGrade?.created_at ||
            profile.created_at ||
            new Date().toISOString(),
          updated_at:
            rotcGrade?.updated_at ||
            profile.updated_at ||
            new Date().toISOString(),
          // Add a flag to indicate if this cadet has ROTC grades yet
          has_rotc_grades: !!rotcGrade
        };
      });
    } catch (error) {
      console.error('Error fetching ROTC grades:', error);
      throw error;
    }
  },

  // Get attendance records for a student
  async getAttendance(userId: string, term: string) {
    try {
      // console.log({ userId });
      // First, get the session IDs for this term
      const { data: sessions, error: sessionsError } = await supabase
        .from('attendance_sessions')
        .select('id, start_time, status')
        .eq('status', 'active')
        // .gte('start_time', this.getTermStartDate(term))
        // .lte('start_time', this.getTermEndDate(term))
        .order('start_time', { ascending: true });

      if (sessionsError) throw sessionsError;

      // Get attendance records for this user and these sessions
      const sessionIds = sessions.map(session => session.id);

      if (sessionIds.length === 0) {
        return []; // No sessions found for this term
      }

      // console.log({ sessionIds });

      const { data: records, error: recordsError } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('profile_id', userId)
        .in('session_id', sessionIds)
        .order('timestamp', { ascending: true });

      if (recordsError) throw recordsError;

      // Combine session data with attendance records

      // console.log({ records });
      return records.map(record => {
        const session = sessions.find(s => s.id === record.session_id);
        return {
          ...record,
          session_date: session
            ? new Date(session.start_time).toISOString().split('T')[0]
            : null
        };
      });
    } catch (error) {
      console.error('Error fetching attendance:', error);
      throw error;
    }
  },

  // Save or update ROTC grades for a student
  async saveGrade(grade: {
    user_id: string;
    term: string;
    attendance_score: number;
    attendance_days: number;
    merit: number;
    demerit: number;
    ttl: number;
    aptitude_score: number;
    exam_score: number;
    final_grade: number;
    overall_grade: number;
    equivalent: number;
    status: string;
    instructor_id: string;
    instructor_notes?: string;
  }) {
    try {
      // Check if a record already exists for this student and term
      const { data: existing, error: checkError } = await supabase
        .from('rotc_grades')
        .select('id')
        .eq('user_id', grade.user_id)
        .eq('term', grade.term)
        .maybeSingle();

      if (checkError) throw checkError;

      // Update fields with timestamps
      const dataToSave = {
        ...grade,
        updated_at: new Date().toISOString()
      };

      let result;

      if (existing) {
        // Update existing record
        const { data, error } = await supabase
          .from('rotc_grades')
          .update(dataToSave)
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        result = data;
      } else {
        // Insert new record
        const { data, error } = await supabase
          .from('rotc_grades')
          .insert({
            ...dataToSave,
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (error) throw error;
        result = data;
      }

      return result;
    } catch (error) {
      console.error('Error saving ROTC grade:', error);
      throw error;
    }
  },

  // Record attendance for a specific day
  async saveAttendance({ user_id, term, session_id, present, instructor_id }) {
    try {
      // If not present, delete the record if it exists
      if (!present) {
        const { error } = await supabase
          .from('attendance_records')
          .delete()
          .eq('profile_id', user_id)
          .eq('session_id', session_id);

        if (error) throw error;
        return { deleted: true };
      }

      // Check if record already exists
      const { data: existing, error: checkError } = await supabase
        .from('attendance_records')
        .select('id')
        .eq('profile_id', user_id)
        .eq('session_id', session_id)
        .maybeSingle();

      if (checkError) throw checkError;

      // If record exists and present, no need to do anything
      if (existing) {
        return { unchanged: true };
      }

      // Create a new attendance record
      const { data, error } = await supabase
        .from('attendance_records')
        .insert({
          profile_id: user_id,
          session_id: session_id,
          timestamp: new Date().toISOString(),
          status: 'present',
          distance: 0, // Default value
          location: null, // Can be updated with actual location if needed
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error saving attendance:', error);
      throw error;
    }
  },

  // Add helper methods for term dates
  getTermStartDate(term) {
    // Extract year from term (e.g., "SY2023-2024" -> 2023)
    const match = term.match(/\d{4}/);
    if (!match) return new Date(new Date().getFullYear(), 0, 1).toISOString(); // Default to Jan 1 of current year

    const year = parseInt(match[0]);
    return new Date(year, 5, 1).toISOString(); // June 1st of term start year
  },

  getTermEndDate(term) {
    // Extract end year from term (e.g., "SY2023-2024" -> 2024)
    const match = term.match(/\d{4}-(\d{4})/);
    if (!match)
      return new Date(new Date().getFullYear() + 1, 5, 30).toISOString(); // Default to June 30 of next year

    const endYear = parseInt(match[1]);
    return new Date(endYear, 5, 30).toISOString(); // June 30th of term end year
  }
};
