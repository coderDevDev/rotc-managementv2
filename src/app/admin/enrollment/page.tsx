'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Filter } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

// Mock data - replace with actual data from your database
const applications = [
  {
    id: 1,
    name: 'Maria Garcia',
    email: 'maria.garcia@email.com',
    course: 'BSCpE',
    year: '1st',
    status: 'Pending',
    submittedDate: '2024-03-15'
  }
  // Add more mock data...
];

export default function EnrollmentPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">Enrollment Applications</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage ROTC enrollment applications and inquiries
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search applications..."
            className="pl-8"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {applications.map(application => (
          <Card key={application.id}>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>{application.name}</span>
                <span
                  className={`text-sm px-2 py-1 rounded-full ${
                    application.status === 'Pending'
                      ? 'bg-yellow-100 text-yellow-800'
                      : application.status === 'Approved'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                  {application.status}
                </span>
              </CardTitle>
              <CardDescription>{application.email}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Course</span>
                  <span>{application.course}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Year</span>
                  <span>{application.year}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Submitted</span>
                  <span>{application.submittedDate}</span>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button className="flex-1" variant="outline">
                    View Details
                  </Button>
                  <Button className="flex-1">Process</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
