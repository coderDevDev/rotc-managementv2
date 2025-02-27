'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import {
  MoreVertical,
  Play,
  StopCircle,
  Trash2,
  Clock,
  Users
} from 'lucide-react';
import { format } from 'date-fns';
import {
  AttendanceSession,
  attendanceService
} from '@/lib/services/attendanceService';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';

interface SessionManagementProps {
  sessions: AttendanceSession[];
  onSessionUpdate: () => void;
}

export function SessionManagement({
  sessions,
  onSessionUpdate
}: SessionManagementProps) {
  const [deleteSession, setDeleteSession] = useState<AttendanceSession | null>(
    null
  );

  const handleStartSession = async (sessionId: string) => {
    try {
      await attendanceService.updateSessionStatus(sessionId, 'active');
      toast.success('Session started successfully');
      onSessionUpdate();
    } catch (error) {
      console.error('Error starting session:', error);
      toast.error('Failed to start session');
    }
  };

  const handleEndSession = async (sessionId: string) => {
    try {
      await attendanceService.updateSessionStatus(sessionId, 'completed');
      toast.success('Session ended successfully');
      onSessionUpdate();
    } catch (error) {
      console.error('Error ending session:', error);
      toast.error('Failed to end session');
    }
  };

  const handleDeleteSession = async () => {
    if (!deleteSession) return;
    try {
      await attendanceService.deleteSession(deleteSession.id);
      toast.success('Session deleted successfully');
      setDeleteSession(null);
      onSessionUpdate();
    } catch (error) {
      console.error('Error deleting session:', error);
      toast.error('Failed to delete session');
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Attendance Sessions</CardTitle>
          <CardDescription>
            Manage your attendance sessions and records
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Radius</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map(session => (
                <TableRow key={session.id}>
                  <TableCell>
                    {format(new Date(session.start_time), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell>
                    {format(new Date(session.start_time), 'h:mm a')} -{' '}
                    {format(new Date(session.end_time), 'h:mm a')}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                        session.status === 'active'
                          ? 'bg-green-50 text-green-700'
                          : session.status === 'completed'
                          ? 'bg-gray-100 text-gray-700'
                          : 'bg-yellow-50 text-yellow-700'
                      }`}>
                      {session.status.charAt(0).toUpperCase() +
                        session.status.slice(1)}
                    </span>
                  </TableCell>
                  <TableCell>
                    {session.location.lat.toFixed(6)},{' '}
                    {session.location.lng.toFixed(6)}
                  </TableCell>
                  <TableCell>{session.radius}m</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {session.status === 'scheduled' && (
                          <DropdownMenuItem
                            onClick={() => handleStartSession(session.id)}>
                            <Play className="mr-2 h-4 w-4" />
                            Start Session
                          </DropdownMenuItem>
                        )}
                        {session.status === 'active' && (
                          <DropdownMenuItem
                            onClick={() => handleEndSession(session.id)}>
                            <StopCircle className="mr-2 h-4 w-4" />
                            End Session
                          </DropdownMenuItem>
                        )}
                        {session.status !== 'active' && (
                          <DropdownMenuItem
                            onClick={() => setDeleteSession(session)}
                            className="text-red-600">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Session
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog
        open={!!deleteSession}
        onOpenChange={() => setDeleteSession(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Attendance Session</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the attendance session and all its
              records. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSession}
              className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
