'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Search, CheckCircle, XCircle, Clock } from 'lucide-react';
import type { AttendanceRecord } from '@/lib/services/attendanceService';
import { Skeleton } from '@/components/ui/skeleton';

interface AttendanceListProps {
  records: AttendanceRecord[];
  loading: boolean;
}

export default function AttendanceList({
  records,
  loading
}: AttendanceListProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredRecords = records.filter(
    record =>
      record.profile.full_name
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      record.profile.student_no.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'late':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'absent':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Attendance List</CardTitle>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search cadets..."
            className="pl-8"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Student No.</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Distance</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-4 w-[150px]" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-[100px]" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-[80px]" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-[60px]" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-[70px]" />
                      </TableCell>
                    </TableRow>
                  ))
                : filteredRecords.map(record => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">
                        {record.profile.full_name}
                      </TableCell>
                      <TableCell>{record.profile.student_no}</TableCell>
                      <TableCell>
                        {new Date(record.timestamp).toLocaleTimeString()}
                      </TableCell>
                      <TableCell>{Math.round(record.distance)}m</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(record.status)}
                          <span className="capitalize">{record.status}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
