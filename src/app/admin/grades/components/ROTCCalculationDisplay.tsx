'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface ROTCCalculationDisplayProps {
  attendance: number;
  aptitude: number;
  exam: number;
}

export function ROTCCalculationDisplay({
  attendance,
  aptitude,
  exam
}: ROTCCalculationDisplayProps) {
  // Calculate ROTC grades
  const finalGrade = attendance + aptitude;
  const examGrade = (exam / 100) * 40;
  const overallGrade = finalGrade + examGrade;

  // Calculate equivalent
  let equivalent;
  if (overallGrade >= 97) equivalent = 1.0;
  if (overallGrade >= 94) equivalent = 1.25;
  if (overallGrade >= 91) equivalent = 1.5;
  if (overallGrade >= 88) equivalent = 1.75;
  if (overallGrade >= 85) equivalent = 2.0;
  if (overallGrade >= 82) equivalent = 2.25;
  if (overallGrade >= 79) equivalent = 2.5;
  if (overallGrade >= 76) equivalent = 2.75;
  if (overallGrade >= 75) equivalent = 3.0;
  else equivalent = 5.0;

  // Determine status
  const status = equivalent <= 3.0 ? 'PASSED' : 'FAILED';

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="text-sm font-medium">Attendance (30%):</div>
          <div>{attendance.toFixed(1)}</div>

          <div className="text-sm font-medium">Aptitude (30%):</div>
          <div>{aptitude.toFixed(1)}</div>

          <div className="text-sm font-medium">Final Grade:</div>
          <div className="font-bold">{finalGrade.toFixed(1)}</div>

          <div className="text-sm font-medium">Exam Raw Score:</div>
          <div>{exam.toFixed(1)}</div>

          <div className="text-sm font-medium">Exam Grade (40%):</div>
          <div>{examGrade.toFixed(1)}</div>

          <div className="text-sm font-medium">Overall Grade:</div>
          <div className="font-bold">{overallGrade.toFixed(1)}</div>

          <div className="text-sm font-medium">Equivalent:</div>
          <div>
            <Badge
              variant={
                equivalent <= 2.0
                  ? 'success'
                  : equivalent <= 3.0
                  ? 'secondary'
                  : 'destructive'
              }>
              {equivalent.toFixed(1)}
            </Badge>
          </div>

          <div className="text-sm font-medium">Status:</div>
          <div>
            <Badge variant={status === 'PASSED' ? 'success' : 'destructive'}>
              {status}
            </Badge>
          </div>
        </div>

        <Progress value={overallGrade} max={100} className="h-2 mt-4" />

        <div className="text-xs text-muted-foreground mt-2 grid grid-cols-2 gap-1">
          <div>97-100 = 1.0 (Excellent)</div>
          <div>85-87 = 2.0 (Very Satisfactory)</div>
          <div>94-96 = 1.25 (Superior)</div>
          <div>82-84 = 2.25 (Satisfactory)</div>
          <div>91-93 = 1.5 (Very Good)</div>
          <div>79-81 = 2.5 (Average)</div>
          <div>88-90 = 1.75 (Good)</div>
          <div>75-78 = 3.0 (Passed)</div>
        </div>
      </CardContent>
    </Card>
  );
}
