'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Clock } from 'lucide-react';

interface CountdownTimerProps {
  startTime: string;
  endTime: string;
  onComplete?: () => void;
}

export function CountdownTimer({
  startTime,
  endTime,
  onComplete
}: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<{
    minutes: number;
    seconds: number;
    percentage: number;
  }>({ minutes: 0, seconds: 0, percentage: 0 });
  const [isCompleting, setIsCompleting] = useState(false);

  useEffect(() => {
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();
    const totalDuration = end - start;

    const updateTimer = () => {
      const now = new Date().getTime();
      const distance = end - now;

      if (distance <= 0) {
        setTimeLeft({ minutes: 0, seconds: 0, percentage: 100 });
        if (!isCompleting) {
          setIsCompleting(true);
          onComplete?.();
        }
        return;
      }

      const minutes = Math.floor(distance / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);
      const percentage = 100 - Math.floor((distance / totalDuration) * 100);

      setTimeLeft({ minutes, seconds, percentage });
    };

    // Initial update
    updateTimer();

    // Update every second
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [startTime, endTime, onComplete, isCompleting]);

  const formatTime = (num: number) => num.toString().padStart(2, '0');

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Time Remaining</CardTitle>
        <Clock className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {formatTime(timeLeft.minutes)}:{formatTime(timeLeft.seconds)}
        </div>
        <div className="mt-2 space-y-1">
          <Progress value={timeLeft.percentage} className="h-2" />
          <p className="text-xs text-muted-foreground">
            Session {timeLeft.percentage === 100 ? 'ended' : 'in progress'} •{' '}
            {100 - timeLeft.percentage}% remaining
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
