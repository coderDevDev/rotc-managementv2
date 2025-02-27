'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { MapPin, UserCheck } from 'lucide-react';
import { LocationPreview } from './LocationPreview';
import { attendanceService } from '@/lib/services/attendanceService';

interface TakeAttendanceButtonProps {
  sessionId: string;
  sessionLocation: {
    lat: number;
    lng: number;
  };
  radius: number;
  onSuccess?: () => void;
  onSessionUpdate?: () => void;
}

export function TakeAttendanceButton({
  sessionId,
  sessionLocation,
  radius,
  onSuccess,
  onSessionUpdate
}: TakeAttendanceButtonProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  // Check if user has already submitted attendance
  useEffect(() => {
    const checkAttendance = async () => {
      try {
        const exists = await attendanceService.checkAttendanceExists(sessionId);
        setHasSubmitted(exists);
      } catch (error) {
        console.error('Error checking attendance:', error);
      }
    };
    checkAttendance();
  }, [sessionId]);

  return (
    <>
      <Button
        className="w-full"
        onClick={() => setShowPreview(true)}
        disabled={hasSubmitted}>
        <MapPin className="mr-2 h-4 w-4" />
        {hasSubmitted ? 'Attendance Submitted' : 'Take Attendance'}
      </Button>

      <LocationPreview
        open={showPreview}
        onOpenChange={setShowPreview}
        sessionId={sessionId}
        sessionLocation={sessionLocation}
        radius={radius}
        onSuccess={() => {
          setHasSubmitted(true);
          onSuccess?.();
          onSessionUpdate?.();
        }}
        onSessionUpdate={onSessionUpdate}
      />
    </>
  );
}
