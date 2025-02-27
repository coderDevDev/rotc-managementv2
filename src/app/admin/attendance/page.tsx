'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  MapPin,
  Clock,
  Users,
  CheckCircle,
  XCircle,
  UserCheck,
  UserX,
  AlertTriangle
} from 'lucide-react';
import AttendanceMap from './AttendanceMap';
import AttendanceList from './AttendanceList';
import SetAttendanceDialog from './SetAttendanceDialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  attendanceService,
  type AttendanceSession,
  type AttendanceRecord
} from '@/lib/services/attendanceService';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { toast } from 'sonner';
import { CountdownTimer } from '@/components/attendance/CountdownTimer';
import { TakeAttendanceButton } from '@/components/attendance/TakeAttendanceButton';
import { SessionManagement } from '@/components/attendance/SessionManagement';

export default function AttendancePage() {
  const [isSettingAttendance, setIsSettingAttendance] = useState(false);
  const [activeSession, setActiveSession] = useState<AttendanceSession | null>(
    null
  );
  const [attendanceRecords, setAttendanceRecords] = useState<
    AttendanceRecord[]
  >([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClientComponentClient();
  const [allSessions, setAllSessions] = useState<AttendanceSession[]>([]);

  // Fetch active session and records
  const fetchAttendanceData = async () => {
    try {
      setLoading(true);
      const session = await attendanceService.getActiveSession();
      setActiveSession(session);

      if (session) {
        const records = await attendanceService.getSessionRecords(session.id);
        setAttendanceRecords(records);
      }
    } catch (error) {
      console.error('Error fetching attendance data:', error);
      toast.error('Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  };

  // Fetch all sessions
  const fetchAllSessions = async () => {
    try {
      const sessions = await attendanceService.getAllSessions();
      setAllSessions(sessions);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      toast.error('Failed to load sessions');
    }
  };

  // Subscribe to real-time updates
  useEffect(() => {
    fetchAttendanceData();
    fetchAllSessions();

    // Subscribe to attendance records changes
    const recordsSubscription = supabase
      .channel('attendance_records')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'attendance_records'
        },
        payload => {
          setAttendanceRecords(prev => [
            payload.new as AttendanceRecord,
            ...prev
          ]);
        }
      )
      .subscribe();

    // Subscribe to session status changes
    const sessionSubscription = supabase
      .channel('attendance_sessions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendance_sessions'
        },
        () => {
          fetchAttendanceData();
        }
      )
      .subscribe();

    return () => {
      recordsSubscription.unsubscribe();
      sessionSubscription.unsubscribe();
    };
  }, []);

  // Calculate stats
  const stats = {
    total: attendanceRecords.length,
    present: attendanceRecords.filter(r => r.status === 'present').length,
    late: attendanceRecords.filter(r => r.status === 'late').length,
    absent: attendanceRecords.filter(r => r.status === 'absent').length
  };

  // Handle session end
  const handleEndSession = async () => {
    if (!activeSession) return;
    try {
      await attendanceService.endSession(activeSession.id);
      toast.success('Attendance session ended');
    } catch (error) {
      console.error('Error ending session:', error);
      toast.error('Failed to end session');
    }
  };

  // Add handler for timer completion
  const handleTimerComplete = async () => {
    if (!activeSession) return;
    try {
      await attendanceService.updateSessionStatus(
        activeSession.id,
        'completed'
      );
      toast.success('Attendance session completed');
      fetchAttendanceData();
    } catch (error) {
      console.error('Error completing session:', error);
      toast.error('Failed to complete session');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">Attendance Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Set location and track ROTC attendance
          </p>
        </div>
        <div className="flex gap-2">
          {(activeSession?.status === 'active' ||
            activeSession?.status === 'scheduled') && (
            <TakeAttendanceButton
              sessionId={activeSession.id}
              sessionLocation={activeSession.location}
              radius={activeSession.radius}
            />
          )}
          <Button onClick={() => setIsSettingAttendance(true)}>
            <MapPin className="w-4 h-4 mr-2" />
            Set Attendance Location
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cadets</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              Cadets in attendance session
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Present</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.present}
            </div>
            <p className="text-xs text-muted-foreground">
              {((stats.present / stats.total) * 100 || 0).toFixed(1)}%
              attendance rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Late</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {stats.late}
            </div>
            <p className="text-xs text-muted-foreground">
              {((stats.late / stats.total) * 100 || 0).toFixed(1)}% arrived late
            </p>
          </CardContent>
        </Card>

        {activeSession?.status !== 'completed' ? (
          <CountdownTimer
            startTime={activeSession?.start_time || ''}
            endTime={activeSession?.end_time || ''}
            onComplete={handleTimerComplete}
          />
        ) : (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Absent</CardTitle>
              <UserX className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {stats.absent}
              </div>
              <p className="text-xs text-muted-foreground">
                {((stats.absent / stats.total) * 100 || 0).toFixed(1)}% missed
                attendance
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Map and Attendance List */}
      <div className="grid gap-6 md:grid-cols-2">
        <AttendanceMap session={activeSession} />
        <AttendanceList records={attendanceRecords} loading={loading} />
      </div>

      <SetAttendanceDialog
        open={isSettingAttendance}
        onOpenChange={setIsSettingAttendance}
        onSuccess={fetchAttendanceData}
      />

      {/* Add Session Management */}
      <SessionManagement
        sessions={allSessions}
        onSessionUpdate={() => {
          fetchAttendanceData();
          fetchAllSessions();
        }}
      />
    </div>
  );
}
