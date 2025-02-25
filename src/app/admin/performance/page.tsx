'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Medal, Star, Trophy, ArrowUpRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';

// Mock data
const performanceData = [
  {
    id: 1,
    name: 'John Doe',
    studentId: '2024-0001',
    overallRank: 1,
    academicScore: 95,
    physicalScore: 92,
    leadershipScore: 94,
    achievements: ['Best Platoon Leader', 'Outstanding Cadet']
  }
];

const categories = [
  {
    title: 'Top Performers',
    icon: Trophy,
    value: '25',
    description: 'Cadets with exceptional ratings'
  },
  {
    title: 'Merit Awards',
    icon: Medal,
    value: '45',
    description: 'Awards given this semester'
  },
  {
    title: 'Average Rating',
    icon: Star,
    value: '88%',
    description: 'Overall cadet performance'
  }
];

export default function PerformancePage() {
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">Performance Evaluation</h1>
          <p className="text-sm text-gray-500 mt-1">
            Monitor and evaluate cadet performance
          </p>
        </div>
        <Button>
          <ArrowUpRight className="w-4 h-4 mr-2" />
          Generate Reports
        </Button>
      </div>

      {/* Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {categories.map(category => (
          <Card key={category.title}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500 flex items-center">
                <category.icon className="w-4 h-4 mr-2 text-primary" />
                {category.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{category.value}</div>
              <p className="text-sm text-gray-500 mt-1">
                {category.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search cadets..."
            className="pl-8"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Performance Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rank</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Student ID</TableHead>
              <TableHead>Academic</TableHead>
              <TableHead>Physical</TableHead>
              <TableHead>Leadership</TableHead>
              <TableHead>Achievements</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {performanceData.map(cadet => (
              <TableRow key={cadet.id}>
                <TableCell>
                  <div className="flex items-center">
                    <Trophy
                      className={`w-4 h-4 mr-2 ${
                        cadet.overallRank <= 3
                          ? 'text-yellow-500'
                          : 'text-gray-400'
                      }`}
                    />
                    {cadet.overallRank}
                  </div>
                </TableCell>
                <TableCell>{cadet.name}</TableCell>
                <TableCell>{cadet.studentId}</TableCell>
                <TableCell>
                  <div className="flex items-center">
                    <div
                      className="w-16 h-2 rounded-full bg-gray-200 mr-2"
                      style={{
                        background: `linear-gradient(90deg, #22c55e ${cadet.academicScore}%, #e5e7eb ${cadet.academicScore}%)`
                      }}
                    />
                    {cadet.academicScore}%
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center">
                    <div
                      className="w-16 h-2 rounded-full bg-gray-200 mr-2"
                      style={{
                        background: `linear-gradient(90deg, #22c55e ${cadet.physicalScore}%, #e5e7eb ${cadet.physicalScore}%)`
                      }}
                    />
                    {cadet.physicalScore}%
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center">
                    <div
                      className="w-16 h-2 rounded-full bg-gray-200 mr-2"
                      style={{
                        background: `linear-gradient(90deg, #22c55e ${cadet.leadershipScore}%, #e5e7eb ${cadet.leadershipScore}%)`
                      }}
                    />
                    {cadet.leadershipScore}%
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {cadet.achievements.map(achievement => (
                      <span
                        key={achievement}
                        className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700">
                        {achievement}
                      </span>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm">
                    View Details
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
