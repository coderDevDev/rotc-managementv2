'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { MapPin } from 'lucide-react';
import { LocationPreview } from './LocationPreview';
import { attendanceService } from '@/lib/services/attendanceService';

interface TakeAttendanceButtonProps {
  sessionId: string;
  sessionLocation: { lat: number; lng: number };
  radius: number;
  disabled?: boolean;
}

export function TakeAttendanceButton({
  sessionId,
  sessionLocation,
  radius,
  disabled
}: TakeAttendanceButtonProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  // Check attendance status when component mounts
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
        onClick={() => setShowPreview(true)}
        disabled={disabled || hasSubmitted}
        variant="outline">
        <MapPin className="w-4 h-4 mr-2" />
        {hasSubmitted ? 'Attendance Submitted' : 'Take Attendance'}
      </Button>

      <LocationPreview
        open={showPreview}
        onOpenChange={setShowPreview}
        sessionId={sessionId}
        sessionLocation={sessionLocation}
        radius={radius}
      />
    </>
  );
}
