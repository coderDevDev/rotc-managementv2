'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { StudentForm } from './components/StudentForm';
import { studentService } from '@/lib/services/studentService';
import { Student } from '@/lib/types/student';
import {
  Search,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Filter,
  Download
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [courseFilter, setCourseFilter] = useState<string>('all');
  const [msFilter, setMsFilter] = useState<string>('all');
  const [yearFilter, setYearFilter] = useState<string>('all');

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const data = await studentService.getStudents();

      console.log({ data });
      setStudents(data);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  const courses = useMemo(() => {
    const courseSet = new Set(
      students.map(student => student.course).filter(Boolean)
    );
    return ['all', ...Array.from(courseSet)];
  }, [students]);

  const msLevels = useMemo(() => {
    const msSet = new Set(students.map(student => student.ms).filter(Boolean));
    return ['all', ...Array.from(msSet)];
  }, [students]);

  const academicYears = useMemo(() => {
    const yearSet = new Set(
      students
        .map(student => {
          const date = student.created_at || '';
          return date ? new Date(date).getFullYear().toString() : null;
        })
        .filter(Boolean)
    );
    return ['all', ...Array.from(yearSet).sort((a, b) => b.localeCompare(a))];
  }, [students]);

  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const matchesSearch = searchQuery
        ? student.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          student.student_no.toLowerCase().includes(searchQuery.toLowerCase())
        : true;

      const matchesCourse =
        courseFilter === 'all' ? true : student.course === courseFilter;

      const matchesMS = msFilter === 'all' ? true : student.ms === msFilter;

      const matchesYear =
        yearFilter === 'all'
          ? true
          : student.created_at?.includes(yearFilter) || false;

      return matchesSearch && matchesCourse && matchesMS && matchesYear;
    });
  }, [students, searchQuery, courseFilter, msFilter, yearFilter]);

  return (
    <div className="space-y-6 p-8">
      {/* Header Section */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Students</h1>
          <p className="text-muted-foreground mt-2">
            Manage enrolled ROTC students
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Student
        </Button>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search students..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Course Filter */}
            <Select value={courseFilter} onValueChange={setCourseFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by Course" />
              </SelectTrigger>
              <SelectContent>
                {courses.map(course => (
                  <SelectItem key={course} value={course}>
                    {course === 'all' ? 'All Courses' : course}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* MS Level Filter */}
            <Select value={msFilter} onValueChange={setMsFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="MS Level" />
              </SelectTrigger>
              <SelectContent>
                {msLevels.map(level => (
                  <SelectItem key={level} value={level}>
                    {level === 'all' ? 'All MS Levels' : level}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Year Filter */}
            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Academic Year" />
              </SelectTrigger>
              <SelectContent>
                {academicYears.map(year => (
                  <SelectItem key={year} value={year}>
                    {year === 'all' ? 'All Years' : year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Students Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Student No.</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>MS Level</TableHead>
                <TableHead>Year Level</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredStudents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    No students found
                  </TableCell>
                </TableRow>
              ) : (
                filteredStudents.map(student => (
                  <TableRow key={student.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{student.full_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {student.email}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{student.student_no}</TableCell>
                    <TableCell>{student.course}</TableCell>
                    <TableCell>{student.ms || 'N/A'}</TableCell>
                    <TableCell>{student.year_level || '1st'}</TableCell>
                    <TableCell>
                      <Badge variant={'success'}>
                        {/* {student.status || 'active'} */}Active
                      </Badge>
                    </TableCell>
                    <TableCell>{student.contact_no || student.phone}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedStudent(student);
                              setFormOpen(true);
                            }}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Student Form Dialog */}
      <StudentForm
        open={formOpen}
        onOpenChange={open => {
          setFormOpen(open);
          if (!open) setSelectedStudent(null);
        }}
        student={selectedStudent}
        onSuccess={fetchStudents}
      />
    </div>
  );
}
