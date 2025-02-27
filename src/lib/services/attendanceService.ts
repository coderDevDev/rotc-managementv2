import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

const supabase = createClientComponentClient();

export interface AttendanceSession {
  id: string;
  location: {
    lat: number;
    lng: number;
  };
  radius: number; // meters
  time_limit: number; // minutes
  start_time: string;
  end_time: string;
  status: 'scheduled' | 'active' | 'completed';
  created_by: string;
}

export interface AttendanceRecord {
  id: string;
  session_id: string;
  profile_id: string;
  timestamp: string;
  location: {
    lat: number;
    lng: number;
  };
  distance: number; // meters from attendance point
  status: 'present' | 'late' | 'absent';
  profile: {
    full_name: string;
    student_no: string;
  };
}

// Haversine formula to calculate distance between two points
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

export const attendanceService = {
  // Create new attendance session
  async createSession(data: {
    location: { lat: number; lng: number };
    radius: number;
    timeLimit: number;
    startTime: string;
    endTime: string;
  }): Promise<AttendanceSession> {
    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!user) throw new Error('No user found');

    const { data: session, error } = await supabase
      .from('attendance_sessions')
      .insert([
        {
          location: data.location,
          radius: data.radius,
          time_limit: data.timeLimit,
          start_time: data.startTime,
          end_time: data.endTime,
          status: 'scheduled',
          created_by: user.id
        }
      ])
      .select()
      .single();

    if (error) throw error;
    return session;
  },

  // Get active or upcoming session
  async getActiveSession(): Promise<AttendanceSession | null> {
    const now = new Date().toISOString();
    const { data: session, error } = await supabase
      .from('attendance_sessions')
      .select('*')
      .or(`status.eq.active,and(status.eq.scheduled,start_time.gte.${now})`)
      .order('start_time', { ascending: true })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return session;
  },

  // Record attendance
  async recordAttendance(
    sessionId: string,
    location: { lat: number; lng: number }
  ): Promise<AttendanceRecord> {
    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!user) throw new Error('No user found');

    // Get the session
    const { data: session, error: sessionError } = await supabase
      .from('attendance_sessions')
      .select()
      .eq('id', sessionId)
      .single();

    if (sessionError) throw sessionError;
    if (!session) throw new Error('Session not found');

    // Calculate distance from attendance point
    const distance = calculateDistance(
      location.lat,
      location.lng,
      session.location.lat,
      session.location.lng
    );

    // Determine attendance status
    const now = new Date();
    const endTime = new Date(session.end_time);
    let status: 'present' | 'late' | 'absent' = 'absent';

    if (distance <= session.radius) {
      status = now <= endTime ? 'present' : 'late';
    }

    // Record attendance
    const { data: record, error } = await supabase
      .from('attendance_records')
      .insert([
        {
          session_id: sessionId,
          profile_id: user.id,
          timestamp: now.toISOString(),
          location,
          distance,
          status
        }
      ])
      .select(
        `
        *,
        profile:profiles (
          full_name,
          student_no
        )
      `
      )
      .single();

    if (error) throw error;
    return record;
  },

  // Get attendance records for a session
  async getSessionRecords(sessionId: string): Promise<AttendanceRecord[]> {
    const { data: records, error } = await supabase
      .from('attendance_records')
      .select(
        `
        *,
        profile:profiles (
          full_name,
          student_no
        )
      `
      )
      .eq('session_id', sessionId)
      .order('timestamp', { ascending: false });

    if (error) throw error;
    return records;
  },

  // End attendance session
  async endSession(sessionId: string): Promise<void> {
    const { error } = await supabase
      .from('attendance_sessions')
      .update({ status: 'completed' })
      .eq('id', sessionId);

    if (error) throw error;
  },

  // Add method to update session status
  async updateSessionStatus(
    sessionId: string,
    status: 'scheduled' | 'active' | 'completed'
  ): Promise<void> {
    const { error } = await supabase
      .from('attendance_sessions')
      .update({ status })
      .eq('id', sessionId);

    if (error) throw error;

    // If session is being completed, mark absent students
    if (status === 'completed') {
      await this.markAbsentStudents(sessionId);
    }
  },

  // Submit attendance
  async submitAttendance(
    sessionId: string,
    location: { lat: number; lng: number }
  ): Promise<AttendanceRecord> {
    // Get the session first
    const { data: session, error: sessionError } = await supabase
      .from('attendance_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sessionError) throw sessionError;
    if (!session) throw new Error('Session not found');

    // Check if session is active
    if (session.status !== 'active') {
      throw new Error('Attendance session is not active');
    }

    // Get current user
    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!user) throw new Error('User not found');

    // Check if already submitted attendance
    const hasAttendance = await this.checkAttendanceExists(sessionId);
    if (hasAttendance) {
      throw new Error('You have already submitted attendance for this session');
    }

    // Calculate distance from attendance point
    const distance = calculateDistance(
      location.lat,
      location.lng,
      session.location.lat,
      session.location.lng
    );

    // Determine attendance status based on distance and time
    const now = new Date();
    const startTime = new Date(session.start_time);
    const endTime = new Date(session.end_time);

    let status: 'present' | 'late' | 'absent';

    if (distance > session.radius) {
      status = 'absent';
    } else if (now > endTime) {
      status = 'late';
    } else {
      status = 'present';
    }

    // Submit attendance record
    const { data: record, error } = await supabase
      .from('attendance_records')
      .insert([
        {
          session_id: sessionId,
          profile_id: user.id,
          location,
          distance,
          status,
          timestamp: new Date().toISOString()
        }
      ])
      .select(
        `
        *,
        profile:profiles (
          full_name,
          student_no
        )
      `
      )
      .single();

    if (error) throw error;
    return record;
  },

  // Get session
  async getSession(sessionId: string): Promise<AttendanceSession | null> {
    const { data: session, error } = await supabase
      .from('attendance_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return session;
  },

  // Add to attendanceService
  async checkAttendanceExists(
    sessionId: string,
    profileId?: string
  ): Promise<boolean> {
    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!user) throw new Error('User not found');

    const { data: record, error } = await supabase
      .from('attendance_records')
      .select('id')
      .eq('session_id', sessionId)
      .eq('profile_id', profileId || user.id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return !!record;
  },

  // Add to attendanceService
  async markAbsentStudents(sessionId: string): Promise<void> {
    // Get all enrolled students
    const { data: enrolledStudents, error: enrollmentError } = await supabase
      .from('enrollments')
      .select('profile_id')
      .eq('status', 'approved');

    if (enrollmentError) throw enrollmentError;

    // Get students who already have attendance records
    const { data: attendanceRecords, error: recordsError } = await supabase
      .from('attendance_records')
      .select('profile_id')
      .eq('session_id', sessionId);

    if (recordsError) throw recordsError;

    // Find students who haven't taken attendance
    const attendedStudentIds = new Set(
      attendanceRecords?.map(record => record.profile_id) || []
    );

    const absentStudents = enrolledStudents.filter(
      student => !attendedStudentIds.has(student.profile_id)
    );

    if (absentStudents.length === 0) return;

    // Create absent records for students who haven't taken attendance
    const absentRecords = absentStudents.map(student => ({
      session_id: sessionId,
      profile_id: student.profile_id,
      status: 'absent',
      distance: 0,
      location: null,
      timestamp: new Date().toISOString()
    }));

    const { error: insertError } = await supabase
      .from('attendance_records')
      .insert(absentRecords);

    if (insertError) throw insertError;
  },

  // Add to attendanceService
  async deleteSession(sessionId: string): Promise<void> {
    // First delete all attendance records
    const { error: recordsError } = await supabase
      .from('attendance_records')
      .delete()
      .eq('session_id', sessionId);

    if (recordsError) throw recordsError;

    // Then delete the session
    const { error: sessionError } = await supabase
      .from('attendance_sessions')
      .delete()
      .eq('id', sessionId);

    if (sessionError) throw sessionError;
  },

  // Add method to get all sessions
  async getAllSessions(): Promise<AttendanceSession[]> {
    const { data: sessions, error } = await supabase
      .from('attendance_sessions')
      .select('*')
      .order('start_time', { ascending: false });

    if (error) throw error;
    return sessions;
  }
};
