import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

const supabase = createClientComponentClient();

export interface EnrollmentData {
  profile_id: string;
  student_no: string;
  ms: string;
  date: string;
  last_name: string;
  first_name: string;
  middle_name?: string;
  address: {
    region_id: string;
    region_name: string;
    province_id: string;
    province_name: string;
    city_id: string;
    city_name: string;
    barangay_id: string;
    barangay_name: string;
    street: string;
    zip_code: string;
  };
  phone_number?: string;
  course: string;
  school: string;
  religion: string;
  date_of_birth: string;
  place_of_birth: string;
  height: string;
  weight: string;
  complexion: string;
  blood_type: string;
  father: string;
  father_occupation: string;
  mother: string;
  mother_occupation: string;
  emergency_contact: string;
  emergency_relationship: string;
  emergency_address: string;
  emergency_phone: string;
  military_science?: string;
  willing_to_advance: boolean;
  status: 'pending' | 'approved' | 'rejected';
}

export const enrollmentService = {
  // Create new enrollment
  async createEnrollment(data: Omit<EnrollmentData, 'profile_id'>) {
    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!user) throw new Error('No user found');

    // Get profile ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single();

    if (profileError) throw profileError;
    if (!profile) throw new Error('No profile found');

    // Create enrollment
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('enrollments')
      .insert([
        {
          profile_id: profile.id,
          student_no: data.student_no,
          ms: data.ms,
          date: data.date,
          last_name: data.last_name,
          first_name: data.first_name,
          middle_name: data.middle_name,
          address: data.address,
          phone_number: data.phone_number,
          course: data.course,
          school: data.school,
          religion: data.religion,
          date_of_birth: data.date_of_birth,
          place_of_birth: data.place_of_birth,
          height: data.height,
          weight: data.weight,
          complexion: data.complexion,
          blood_type: data.blood_type,
          father: data.father,
          father_occupation: data.father_occupation,
          mother: data.mother,
          mother_occupation: data.mother_occupation,
          emergency_contact: data.emergency_contact,
          emergency_relationship: data.emergency_relationship,
          emergency_address: data.emergency_address,
          emergency_phone: data.emergency_phone,
          military_science: data.military_science,
          willing_to_advance: data.willing_to_advance,
          status: 'pending'
        }
      ])
      .select()
      .single();

    if (enrollmentError) throw enrollmentError;
    return enrollment;
  },

  // Get all enrollments (for admin)
  async getAllEnrollments() {
    const { data: enrollments, error } = await supabase
      .from('enrollments')
      .select(
        `
        *,
        profile:profiles (
          id,
          full_name,
          email
        )
      `
      )
      .order('created_at', { ascending: false });

    if (error) throw error;
    return enrollments;
  },

  // Get user's enrollments
  async getUserEnrollments() {
    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!user) throw new Error('No user found');

    const { data: enrollments, error } = await supabase
      .from('enrollments')
      .select('*')
      .eq('profile_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return enrollments;
  },

  // Get single enrollment
  async getEnrollment(id: string) {
    const { data: enrollment, error } = await supabase
      .from('enrollments')
      .select(
        `
        *,
        profile:profiles (
          id,
          full_name,
          email
        )
      `
      )
      .eq('id', id)
      .single();

    if (error) throw error;
    return enrollment;
  },

  // Update enrollment
  async updateEnrollment(id: string, data: Partial<EnrollmentData>) {
    const { data: enrollment, error } = await supabase
      .from('enrollments')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return enrollment;
  },

  // Update enrollment status (for admin)
  async updateEnrollmentStatus(
    id: string,
    status: 'pending' | 'approved' | 'rejected' | 'archived'
  ) {
    const { data: enrollment, error } = await supabase
      .from('enrollments')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return enrollment;
  },

  // Delete enrollment
  async deleteEnrollment(id: string) {
    const { error } = await supabase.from('enrollments').delete().eq('id', id);

    if (error) throw error;
    return true;
  }
};
