import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

const supabase = createClientComponentClient();

export interface Student {
  id: string;
  full_name: string;
  student_no: string;
  email: string;
  contact_no?: string;
  phone?: string;
  date_of_birth?: string;
  gender?: string;
  course?: string;
  year_level?: string;
  status?: string;
  ms?: string; // Military Science level
  created_at?: string;
  // Add more fields as needed
}

export const studentService = {
  async getStudents(): Promise<Student[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select(
        `
        *,
        enrollments:enrollments(
          id, 
          ms, 
          student_no, 
          course, 
          date, 
          created_at
        )
      `
      )

      .order('full_name');

    if (error) {
      console.error('Error fetching students:', error);
      throw error;
    }

    console.log({ dydy: data });
    // Map the result to include enrollment data
    return (data || []).map(profile => {
      // Get the most recent enrollment for the student
      const latestEnrollment =
        profile.enrollments && profile.enrollments.length > 0
          ? profile.enrollments.sort(
              (a, b) =>
                new Date(b.created_at).getTime() -
                new Date(a.created_at).getTime()
            )[0]
          : null;

      return {
        id: profile.id,
        full_name: profile.full_name,
        student_no:
          profile.enrollments && profile.enrollments.length > 0
            ? profile.enrollments[0].student_no
            : '',
        email: profile.email,
        contact_no: profile.contact_no,
        phone: profile.phone,
        date_of_birth: profile.date_of_birth,
        gender: profile.gender,
        course: profile.course || latestEnrollment?.course || '',
        year_level: profile.year_level,
        status: profile.status || 'active',
        ms: latestEnrollment?.ms || '',
        created_at: profile.created_at || latestEnrollment?.created_at || ''
      };
    });
  },

  async getStudent(id: string): Promise<Student | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select(
        `
        *,
        enrollments:enrollments(
          id, 
          ms, 
          student_no, 
          course, 
          date, 
          created_at
        )
      `
      )
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching student:', error);
      return null;
    }

    if (!data) return null;

    // Get the most recent enrollment
    const latestEnrollment =
      data.enrollments && data.enrollments.length > 0
        ? data.enrollments.sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime()
          )[0]
        : null;

    return {
      id: data.id,
      full_name: data.full_name,
      student_no: data.student_no || latestEnrollment?.student_no || '',
      email: data.email,
      contact_no: data.contact_no,
      phone: data.phone,
      date_of_birth: data.date_of_birth,
      gender: data.gender,
      course: data.course || latestEnrollment?.course || '',
      year_level: data.year_level,
      status: data.status || 'active',
      ms: latestEnrollment?.ms || '',
      created_at: data.created_at || latestEnrollment?.created_at || ''
    };
  },

  async createStudent(data: Omit<Student, 'id' | 'created_at' | 'updated_at'>) {
    const { data: student, error } = await supabase
      .from('profiles')
      .insert([
        {
          ...data,
          role: 'student',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (error) throw error;
    return student as Student;
  },

  async updateStudent(id: string, data: Partial<Student>): Promise<void> {
    const supabase = createClientComponentClient();

    // First update the profile
    const profileUpdate = {
      full_name: data.full_name,
      student_no: data.student_no,
      email: data.email,
      contact_no: data.contact_no,
      date_of_birth: data.date_of_birth,
      gender: data.gender,
      course: data.course,
      year_level: data.year_level,
      status: data.status
    };

    const { error } = await supabase
      .from('profiles')
      .update(profileUpdate)
      .eq('id', id);

    if (error) {
      console.error('Error updating student profile:', error);
      throw error;
    }

    // If MS level is provided, update the latest enrollment or create a new one
    if (data.ms) {
      // First check if there's an existing enrollment
      const { data: enrollments, error: enrollmentError } = await supabase
        .from('enrollments')
        .select('*')
        .eq('profile_id', id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (enrollmentError) {
        console.error('Error fetching enrollments:', enrollmentError);
        throw enrollmentError;
      }

      if (enrollments && enrollments.length > 0) {
        // Update the latest enrollment
        const { error: updateError } = await supabase
          .from('enrollments')
          .update({ ms: data.ms })
          .eq('id', enrollments[0].id);

        if (updateError) {
          console.error('Error updating enrollment:', updateError);
          throw updateError;
        }
      } else {
        // Create a new enrollment
        const { error: createError } = await supabase
          .from('enrollments')
          .insert({
            profile_id: id,
            student_no: data.student_no,
            ms: data.ms,
            course: data.course,
            date: new Date().toISOString()
          });

        if (createError) {
          console.error('Error creating enrollment:', createError);
          throw createError;
        }
      }
    }
  },

  async deleteStudent(id: string) {
    const { error } = await supabase.from('profiles').delete().eq('id', id);

    if (error) throw error;
  },

  async searchStudents(query: string) {
    const { data: students, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'cadet')
      .or(
        `full_name.ilike.%${query}%,student_no.ilike.%${query}%,email.ilike.%${query}%`
      )
      .order('created_at', { ascending: false });

    if (error) throw error;
    return students as Student[];
  }
};
