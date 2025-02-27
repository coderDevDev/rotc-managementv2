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
import { useRouter } from 'next/navigation';
import { CountdownTimer } from '@/components/attendance/CountdownTimer';
import { TakeAttendanceButton } from '@/components/attendance/TakeAttendanceButton';
import { SessionManagement } from '@/components/attendance/SessionManagement';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export default function AttendancePage() {
  const [isSettingAttendance, setIsSettingAttendance] = useState(false);
  const [activeSession, setActiveSession] = useState<AttendanceSession | null>(
    null
  );
  const [attendanceRecords, setAttendanceRecords] = useState<
    AttendanceRecord[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [allSessions, setAllSessions] = useState<AttendanceSession[]>([]);
  const [attendanceHistory, setAttendanceHistory] = useState<
    AttendanceRecord[]
  >([]);

  const supabase = createClientComponentClient();
  const router = useRouter();

  // Fetch user role and session
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const {
          data: { session }
        } = await supabase.auth.getSession();
        if (!session) {
          router.push('/login');
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();

        setUserRole(profile?.role);
      } catch (error) {
        console.error('Error fetching user data:', error);
        toast.error('Failed to load user data');
      }
    };

    fetchUserData();
  }, []);

  // Fetch attendance data
  const fetchAttendanceData = async () => {
    try {
      setLoading(true);
      const session = await attendanceService.getActiveSession();
      setActiveSession(session);

      if (session) {
        if (userRole === 'rotc_coordinator') {
          const records = await attendanceService.getSessionRecords(session.id);
          setAttendanceRecords(records);
        } else {
          // For cadets, fetch their own record for active session
          const record = await attendanceService.getUserSessionRecord(
            session.id
          );
          if (record) {
            setAttendanceRecords([record]);
          }
        }
      }

      // Fetch attendance history for cadets
      if (userRole !== 'rotc_coordinator') {
        const history = await attendanceService.getUserAttendanceHistory();
        setAttendanceHistory(history);
      }
    } catch (error) {
      // console.error('Error fetching attendance data:', error);
      // toast.error('Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  };

  // Fetch all sessions for coordinators
  const fetchAllSessions = async () => {
    if (userRole !== 'rotc_coordinator') return;

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
        { event: 'INSERT', schema: 'public', table: 'attendance_records' },
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
        { event: '*', schema: 'public', table: 'attendance_sessions' },
        () => {
          fetchAttendanceData();
        }
      )
      .subscribe();

    return () => {
      recordsSubscription.unsubscribe();
      sessionSubscription.unsubscribe();
    };
  }, [userRole]);

  const isCoordinator = userRole === 'rotc_coordinator';

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
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">
            {isCoordinator ? 'Attendance Management' : 'My Attendance'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {isCoordinator
              ? 'Monitor and manage ROTC attendance'
              : 'Track your attendance status'}
          </p>
        </div>
        {isCoordinator && (
          <Button onClick={() => setIsSettingAttendance(true)}>
            <MapPin className="w-4 h-4 mr-2" />
            Set Attendance Location
          </Button>
        )}
      </div>

      {/* Stats Cards - show different stats for cadets */}
      {!isCoordinator && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Sessions
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {attendanceHistory.length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Attendance Rate
              </CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {(
                  (attendanceHistory.filter(r => r.status === 'present')
                    .length /
                    Math.max(attendanceHistory.length, 1)) *
                  100
                ).toFixed(1)}
                %
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Late Arrivals
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {attendanceHistory.filter(r => r.status === 'late').length}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <div className="grid gap-6 md:grid-cols-2">
        <AttendanceMap session={activeSession} />
        {isCoordinator ? (
          <AttendanceList records={attendanceRecords} loading={loading} />
        ) : (
          <div className="space-y-6">
            {/* Active Session Card */}
            <Card>
              <CardHeader>
                <CardTitle>Current Session</CardTitle>
              </CardHeader>
              <CardContent>
                {activeSession ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        Session ends in:
                      </div>
                      <CountdownTimer
                        startTime={activeSession.start_time}
                        endTime={activeSession.end_time}
                        onComplete={handleTimerComplete}
                      />
                    </div>
                    <TakeAttendanceButton
                      sessionId={activeSession.id}
                      sessionLocation={activeSession.location}
                      radius={activeSession.radius}
                      onSuccess={fetchAttendanceData}
                      onSessionUpdate={fetchAttendanceData}
                    />
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    No active attendance session
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Attendance History Card */}
            <Card>
              <CardHeader>
                <CardTitle>My Attendance History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Distance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center">
                            Loading...
                          </TableCell>
                        </TableRow>
                      ) : attendanceHistory.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center">
                            No attendance records found
                          </TableCell>
                        </TableRow>
                      ) : (
                        attendanceHistory.map(record => (
                          <TableRow key={record.id}>
                            <TableCell>
                              {new Date(record.timestamp).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              {new Date(record.timestamp).toLocaleTimeString()}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  record.status === 'present'
                                    ? 'success'
                                    : record.status === 'late'
                                    ? 'warning'
                                    : 'destructive'
                                }>
                                {record.status.toUpperCase()}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {Math.round(record.distance)}m
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Coordinator-only components */}
      {isCoordinator && (
        <>
          <SetAttendanceDialog
            open={isSettingAttendance}
            onOpenChange={setIsSettingAttendance}
            onSuccess={fetchAttendanceData}
          />
          <SessionManagement
            sessions={allSessions}
            onSessionUpdate={() => {
              fetchAttendanceData();
              fetchAllSessions();
            }}
          />
        </>
      )}
    </div>
  );
}
