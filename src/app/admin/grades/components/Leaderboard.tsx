'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Medal } from 'lucide-react';

interface LeaderboardEntry {
  id: string;
  rank: number;
  full_name: string;
  student_no: string;
  overall_score: number;
  achievements: string[];
}

interface LeaderboardProps {
  data: LeaderboardEntry[];
}

export function Leaderboard({ data }: LeaderboardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Performers</CardTitle>
        <CardDescription>
          Top 10 cadets based on overall performance
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.map((entry, index) => (
            <div
              key={entry.id}
              className="flex items-center justify-between p-4 rounded-lg bg-slate-50">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center">
                  {index < 3 ? (
                    <Medal
                      className={
                        index === 0
                          ? 'text-yellow-500'
                          : index === 1
                          ? 'text-slate-400'
                          : 'text-amber-600'
                      }
                    />
                  ) : (
                    <span className="text-lg font-semibold text-slate-500">
                      {index + 1}
                    </span>
                  )}
                </div>
                <div>
                  <div className="font-medium">{entry.full_name}</div>
                  <div className="text-sm text-slate-500">
                    {entry.student_no}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex gap-2">
                  {entry.achievements.map((achievement, i) => (
                    <Badge key={i} variant="secondary">
                      {achievement}
                    </Badge>
                  ))}
                </div>
                <div className="text-lg font-semibold">
                  {entry.overall_score.toFixed(1)}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
