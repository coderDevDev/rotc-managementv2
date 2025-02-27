'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Medal, TrendingUp } from 'lucide-react';
import { TermPerformance } from '@/lib/types/grade';

interface LeaderboardProps {
  data: TermPerformance[] | null;
}

export function Leaderboard({ data }: LeaderboardProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Performers</CardTitle>
          <CardDescription>No performance data available</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Sort by overall score and add rank
  const rankedData = data
    .sort((a, b) => b.overall_score - a.overall_score)
    .slice(0, 10) // Get top 10
    .map((entry, index) => ({
      ...entry,
      rank: index + 1
    }));

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
          {rankedData.map(entry => (
            <div
              key={entry.student_id}
              className="flex items-center justify-between p-4 rounded-lg bg-slate-50">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center">
                  {entry.rank <= 3 ? (
                    <Medal
                      className={
                        entry.rank === 1
                          ? 'text-yellow-500'
                          : entry.rank === 2
                          ? 'text-slate-400'
                          : 'text-amber-600'
                      }
                    />
                  ) : (
                    <span className="text-lg font-semibold text-slate-500">
                      {entry.rank}
                    </span>
                  )}
                </div>
                <div>
                  <div className="font-medium">{entry.student_name}</div>
                  <div className="text-sm text-slate-500">
                    {entry.student_no}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex gap-2">
                  {Object.entries(entry.grades).map(([category, grade]) => (
                    <Badge
                      key={category}
                      variant={grade.score >= 90 ? 'default' : 'secondary'}
                      className="capitalize text-white">
                      {category}: {grade.score.toFixed(1)}%
                    </Badge>
                  ))}
                </div>
                <div className="flex items-center gap-1 text-lg font-semibold">
                  <TrendingUp
                    className={`w-4 h-4 ${
                      entry.overall_score >= 90
                        ? 'text-green-500'
                        : entry.overall_score >= 80
                        ? 'text-blue-500'
                        : 'text-gray-500'
                    } text-xl`}
                  />
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
