'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface AnalyticsChartsProps {
  performanceData: {
    category: string;
    average: number;
    passing: number;
    total: number;
  }[];
  trendData: {
    term: string;
    academics: number;
    leadership: number;
    physical_fitness: number;
  }[];
}

export function AnalyticsCharts({
  performanceData,
  trendData
}: AnalyticsChartsProps) {
  return (
    <div className="grid gap-6">
      {/* Category Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Category Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar
                  name="Average Score"
                  dataKey="average"
                  fill="#2563eb"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  name="Passing Rate"
                  dataKey="passing"
                  fill="#16a34a"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Performance Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="term" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  name="Academics"
                  dataKey="academics"
                  stroke="#2563eb"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  name="Leadership"
                  dataKey="leadership"
                  stroke="#16a34a"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  name="Physical Fitness"
                  dataKey="physical_fitness"
                  stroke="#d97706"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
