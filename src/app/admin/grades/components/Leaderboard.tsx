'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy } from 'lucide-react';

interface TermPerformance {
  student_id: string;
  student_name: string;
  student_no: string;
  term: string;
  grades: {
    academics: { id: string; score: number } | null;
    leadership: { id: string; score: number } | null;
    physical_fitness: { id: string; score: number } | null;
  };
  overall_score: number;
}

export function Leaderboard({ data }: { data: TermPerformance[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Top Performers
        </CardTitle>
        <CardDescription>Top 10 cadets by overall score</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.map((entry, index) => (
          <div
            key={entry.student_id}
            className="flex items-center justify-between">
            <div>
              <div className="font-medium">
                {index + 1}. {entry.student_name}
              </div>
              <div className="text-sm text-muted-foreground">
                {entry.student_no}
              </div>
            </div>
            <div className="flex gap-2">
              {Object.entries(entry.grades).map(([category, grade]) => {
                if (!grade) return null;
                return (
                  <Badge
                    key={category}
                    variant={grade.score >= 90 ? 'default' : 'secondary'}
                    className="capitalize text-white">
                    {category.replace('_', ' ')}: {grade.score.toFixed(1)}%
                  </Badge>
                );
              })}
              <Badge variant="success" className="ml-2">
                {entry.overall_score.toFixed(1)}%
              </Badge>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
