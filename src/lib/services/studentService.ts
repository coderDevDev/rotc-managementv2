import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

const supabase = createClientComponentClient();

export interface Student {
  id: string;
  student_no: string;
  full_name: string;
  course: string;
  year_level: string;
  status: 'active' | 'inactive';
  contact_no: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export const studentService = {
  async getStudents() {
    const { data: students, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'cadet')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return students as Student[];
  },

  async getStudent(id: string) {
    const { data: student, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return student as Student;
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

  async updateStudent(id: string, data: Partial<Student>) {
    const { data: student, error } = await supabase
      .from('profiles')
      .update({
        ...data,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return student as Student;
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
