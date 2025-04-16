'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Filter, Search } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import EnrollmentForm from './EnrollmentForm';
import { enrollmentService } from '@/lib/services/enrollmentService';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  Check,
  X,
  Eye,
  Calendar,
  School,
  GraduationCap,
  Phone,
  MapPin,
  User,
  Heart,
  Users,
  AlertCircle,
  Printer,
  Loader2,
  LayoutGrid,
  Table as TableIcon,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown
} from 'lucide-react';
import Image from 'next/image';
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
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  SortingState,
  getSortedRowModel,
  ColumnFiltersState,
  getFilteredRowModel
} from '@tanstack/react-table';

import EnrollmentDetails from './components/EnrollmentDetails';

import { columns } from './components/columns';

interface Enrollment {
  id: string;
  student_no: string;
  ms: string;
  date: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  address: {
    region_id: string;
    region_name: string;
    province_id: string;
    province_name: string;
    city_id: string;
    city_name: string;
    barangay_id: string;
    barangay_name: string;
    street: string;
    zip_code: string;
  };
  phone_number?: string;
  course: string;
  school: string;
  religion: string;
  date_of_birth: string;
  place_of_birth: string;
  height: string;
  weight: string;
  complexion: string;
  blood_type: string;
  father: string;
  father_occupation: string;
  mother: string;
  mother_occupation: string;
  emergency_contact: string;
  emergency_relationship: string;
  emergency_address: string;
  emergency_phone: string;
  military_science?: string;
  willing_to_advance: boolean;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  profile: {
    id: string;
    full_name: string;
    email: string;
  };
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
}

function DataTable<TData, TValue>({
  columns,
  data,
  searchKey = 'student_no'
}: DataTableProps<TData, TValue> & { searchKey?: string }) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [globalFilter, setGlobalFilter] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<string>('all');

  const courses = useMemo(() => {
    const courseSet = new Set(data.map((item: any) => item.course));
    return ['all', ...Array.from(courseSet)];
  }, [data]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    filterFns: {
      fuzzy: (row, columnId, value) => {
        const itemValue = row.getValue(columnId);
        if (typeof itemValue === 'string') {
          return itemValue.toLowerCase().includes(value.toLowerCase());
        }
        return false;
      }
    },
    state: {
      sorting,
      columnFilters,
      globalFilter
    },
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: 'fuzzy',
    getFilteredRowModel: getFilteredRowModel()
  });

  const filteredData = useMemo(() => {
    let rows = table.getFilteredRowModel().rows;
    if (selectedCourse !== 'all') {
      rows = rows.filter(
        row => (row.original as any).course === selectedCourse
      );
    }
    return rows;
  }, [selectedCourse, table.getFilteredRowModel().rows]);

  const handleSearch = (value: string) => {
    setGlobalFilter(value);
    table.setGlobalFilter(value);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, student number..."
              value={globalFilter ?? ''}
              onChange={event => handleSearch(event.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        <Select value={selectedCourse} onValueChange={setSelectedCourse}>
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
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <TableHead
                    key={header.id}
                    className={cn(
                      'bg-gray-50 font-semibold',
                      header.column.getCanSort() && 'cursor-pointer select-none'
                    )}
                    onClick={header.column.getToggleSortingHandler()}>
                    <div className="flex items-center gap-2">
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                      {header.column.getCanSort() && (
                        <ArrowUpDown className="h-4 w-4" />
                      )}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {filteredData.length ? (
              filteredData.map(row => (
                <TableRow
                  key={row.id}
                  className="hover:bg-gray-50 transition-colors">
                  {row.getVisibleCells().map(cell => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-gray-500">
                  No results found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between px-2">
        <div className="flex-1 text-sm text-gray-500">
          {filteredData.length} results found
          {selectedCourse !== 'all' && ` in ${selectedCourse}`}
        </div>
        <div className="flex items-center space-x-6 lg:space-x-8">
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium">Rows per page</p>
            <Select
              value={`${rowsPerPage}`}
              onValueChange={value => {
                table.setPageSize(Number(value));
                setRowsPerPage(Number(value));
              }}>
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue placeholder={rowsPerPage} />
              </SelectTrigger>
              <SelectContent side="top">
                {[10, 20, 30, 40, 50].map(pageSize => (
                  <SelectItem key={pageSize} value={`${pageSize}`}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex w-[100px] items-center justify-center text-sm font-medium">
            Page {table.getState().pagination.pageIndex + 1} of{' '}
            {table.getPageCount()}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}>
              <span className="sr-only">Go to first page</span>
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}>
              <span className="sr-only">Go to previous page</span>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}>
              <span className="sr-only">Go to next page</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}>
              <span className="sr-only">Go to last page</span>
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EnrollmentPage() {
  const router = useRouter();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmationDialog, setConfirmationDialog] = useState<{
    isOpen: boolean;
    enrollmentId: string;
    action: 'approve' | 'reject';
  }>({
    isOpen: false,
    enrollmentId: '',
    action: 'approve'
  });
  const [viewDialog, setViewDialog] = useState<{
    isOpen: boolean;
    enrollment: Enrollment | null;
  }>({
    isOpen: false,
    enrollment: null
  });
  const [viewLoading, setViewLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [groupByCourse, setGroupByCourse] = useState(false);
  const [cadetEnrollment, setCadetEnrollment] = useState<Enrollment | null>(
    null
  );

  const supabase = createClientComponentClient();

  const fetchData = async () => {
    try {
      setLoading(true);
      const {
        data: { session }
      } = await supabase.auth.getSession();

      if (!session) {
        router.push('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      setUserRole(profile?.role);
      setUserId(session.user.id);

      if (profile?.role === 'rotc_coordinator') {
        const { data } = await supabase
          .from('enrollments')
          .select('*')
          .order('created_at', { ascending: false });
        setEnrollments(data || []);
      } else {
        const { data } = await supabase
          .from('enrollments')
          .select('*')
          .eq('profile_id', session.user.id)
          .single();
        setCadetEnrollment(data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleViewDetails = (enrollment: Enrollment) => {
    setViewDialog({
      isOpen: true,
      enrollment
    });
  };

  const handleProcessEnrollment = async (
    id: string,
    status: 'approved' | 'rejected'
  ) => {
    try {
      await enrollmentService.updateEnrollmentStatus(id, status);
      toast.success(`Enrollment ${status} successfully`);
      fetchData(); // Refresh the list
    } catch (error) {
      console.error('Error updating enrollment:', error);
      toast.error('Failed to update enrollment');
    } finally {
      setConfirmationDialog(prev => ({ ...prev, isOpen: false }));
    }
  };

  const showConfirmationDialog = (id: string, action: 'approve' | 'reject') => {
    setConfirmationDialog({
      isOpen: true,
      enrollmentId: id,
      action
    });
  };

  const filteredEnrollments = useMemo(() => {
    return enrollments.filter(enrollment => {
      const matchesSearch = searchTerm
        ? enrollment.full_name
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          enrollment.student_no.toLowerCase().includes(searchTerm.toLowerCase())
        : true;

      const matchesCourse =
        filterStatus === 'all' ? true : enrollment.status === filterStatus;

      return matchesSearch && matchesCourse;
    });
  }, [enrollments, searchTerm, filterStatus]);

  const groupedEnrollments = useMemo(() => {
    if (!groupByCourse) return { all: filteredEnrollments };

    return filteredEnrollments.reduce((acc, enrollment) => {
      const course = enrollment.course || 'Uncategorized';
      if (!acc[course]) acc[course] = [];
      acc[course].push(enrollment);
      return acc;
    }, {} as Record<string, typeof filteredEnrollments>);
  }, [filteredEnrollments, groupByCourse]);

  const handlePrint = () => {
    window.print();
  };

  const isCoordinator = userRole === 'rotc_coordinator';

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return (
          <Badge variant="success" className="gap-1">
            <CheckCircle className="w-3 h-3" />
            Approved
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="w-3 h-3" />
            Rejected
          </Badge>
        );
      default:
        return (
          <Badge
            // variant="secondary"

            className="gap-1 bg-yellow-500">
            <Clock className="w-3 h-3" />
            Pending
          </Badge>
        );
    }
  };

  const canApply =
    !isCoordinator &&
    !enrollments.some(app =>
      ['pending', 'approved'].includes(app.status?.toLowerCase())
    );

  if (loading) {
    return <div>Loading...</div>;
  }

  if (userRole === 'cadet') {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardHeader>
            <CardTitle>Enrollment Application Details</CardTitle>
          </CardHeader>
          <CardContent>
            {cadetEnrollment ? (
              <EnrollmentDetails enrollment={cadetEnrollment} />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No enrollment application found.
                <div className="mt-4">
                  <Button
                    onClick={() =>
                      setViewDialog({ isOpen: true, enrollment: null })
                    }
                    className="shadow-lg hover:shadow-xl transition-all">
                    <Plus className="w-4 h-4 mr-2" />
                    Apply for ROTC
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6 p-8">
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-8 rounded-lg">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {isCoordinator ? 'Enrollment Applications' : 'ROTC Enrollment'}
            </h1>
            <p className="text-muted-foreground mt-2">
              {isCoordinator
                ? 'Review and manage ROTC enrollment applications'
                : 'Apply and track your ROTC enrollment status'}
            </p>
          </div>
          {/* {canApply && (
            <Button
              onClick={() => setViewDialog({ isOpen: true, enrollment: null })}
              className="shadow-lg hover:shadow-xl transition-all">
              <Plus className="w-4 h-4 mr-2" />
              Apply for ROTC
            </Button>
          )} */}
        </div>
      </div>

      <AlertDialog
        open={confirmationDialog.isOpen}
        onOpenChange={isOpen =>
          setConfirmationDialog(prev => ({ ...prev, isOpen }))
        }>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmationDialog.action === 'approve'
                ? 'Approve Enrollment'
                : 'Reject Enrollment'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmationDialog.action === 'approve'
                ? 'Are you sure you want to approve this enrollment? This action cannot be undone.'
                : 'Are you sure you want to reject this enrollment? This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                handleProcessEnrollment(
                  confirmationDialog.enrollmentId,
                  confirmationDialog.action === 'approve'
                    ? 'approved'
                    : 'rejected'
                )
              }
              className={
                confirmationDialog.action === 'approve'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-red-600 hover:bg-red-700'
              }>
              {confirmationDialog.action === 'approve' ? 'Approve' : 'Reject'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={viewDialog.isOpen}
        onOpenChange={isOpen => setViewDialog(prev => ({ ...prev, isOpen }))}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto print:max-h-none print:overflow-visible">
          <DialogHeader className="flex flex-row items-center justify-between print:hidden">
            <DialogTitle className="text-2xl font-bold">
              Enrollment Application Details
            </DialogTitle>
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
          </DialogHeader>

          {viewLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : viewDialog.enrollment ? (
            <div className="space-y-8">
              <div className="text-center space-y-2 border-b pb-4">
                <h2 className="text-xl font-bold">
                  CENTRAL BICOL STATE UNIVERSITY OF AGRICULTURE
                </h2>
                <p className="text-lg">SIPOCOT ROTC UNIT</p>
                <p className="text-sm text-gray-600">
                  Department of Military Science and Tactics
                </p>
              </div>

              <div className="flex justify-end">
                {getStatusBadge(viewDialog.enrollment.status)}
              </div>

              <Section
                title="Basic Information"
                icon={<User className="w-5 h-5" />}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <InfoField
                    icon={fieldIcons.student}
                    label="Student No."
                    value={viewDialog.enrollment.student_no}
                  />
                  <InfoField
                    icon={fieldIcons.academic}
                    label="MS Level"
                    value={viewDialog.enrollment.ms}
                  />
                  <InfoField
                    icon={fieldIcons.date}
                    label="Application Date"
                    value={new Date(
                      viewDialog.enrollment.created_at
                    ).toLocaleDateString()}
                  />
                </div>
              </Section>

              <Section
                title="Personal Information"
                icon={<GraduationCap className="w-5 h-5" />}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <InfoField
                    icon={fieldIcons.student}
                    label="First Name"
                    value={viewDialog.enrollment.first_name}
                  />
                  <InfoField
                    icon={fieldIcons.student}
                    label="Middle Name"
                    value={viewDialog.enrollment.middle_name || 'N/A'}
                  />
                  <InfoField
                    icon={fieldIcons.student}
                    label="Last Name"
                    value={viewDialog.enrollment.last_name}
                  />
                  <InfoField
                    icon={fieldIcons.academic}
                    label="Course"
                    value={viewDialog.enrollment.course}
                  />
                  <InfoField
                    icon={fieldIcons.academic}
                    label="School"
                    value={viewDialog.enrollment.school}
                  />
                  <InfoField
                    icon={fieldIcons.student}
                    label="Religion"
                    value={viewDialog.enrollment.religion}
                  />
                </div>
              </Section>

              <Section title="Address" icon={<MapPin className="w-5 h-5" />}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InfoField
                    icon={fieldIcons.location}
                    label="Complete Address"
                    value={`${viewDialog.enrollment.address.street}, ${viewDialog.enrollment.address.barangay_name}, ${viewDialog.enrollment.address.city_name}, ${viewDialog.enrollment.address.province_name}, ${viewDialog.enrollment.address.region_name}`}
                  />
                  <InfoField
                    icon={fieldIcons.location}
                    label="ZIP Code"
                    value={viewDialog.enrollment.address.zip_code}
                  />
                </div>
              </Section>

              <Section
                title="Physical Information"
                icon={<Heart className="w-5 h-5" />}>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <InfoField
                    icon={fieldIcons.physical}
                    label="Height"
                    value={viewDialog.enrollment.height}
                  />
                  <InfoField
                    icon={fieldIcons.physical}
                    label="Weight"
                    value={viewDialog.enrollment.weight}
                  />
                  <InfoField
                    icon={fieldIcons.physical}
                    label="Complexion"
                    value={viewDialog.enrollment.complexion}
                  />
                  <InfoField
                    icon={fieldIcons.physical}
                    label="Blood Type"
                    value={viewDialog.enrollment.blood_type}
                  />
                </div>
              </Section>

              <Section
                title="Family Background"
                icon={<Users className="w-5 h-5" />}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InfoField
                    icon={fieldIcons.family}
                    label="Father's Name"
                    value={viewDialog.enrollment.father}
                  />
                  <InfoField
                    icon={fieldIcons.family}
                    label="Father's Occupation"
                    value={viewDialog.enrollment.father_occupation}
                  />
                  <InfoField
                    icon={fieldIcons.family}
                    label="Mother's Name"
                    value={viewDialog.enrollment.mother}
                  />
                  <InfoField
                    icon={fieldIcons.family}
                    label="Mother's Occupation"
                    value={viewDialog.enrollment.mother_occupation}
                  />
                </div>
              </Section>

              <Section
                title="Emergency Contact"
                icon={<AlertCircle className="w-5 h-5" />}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InfoField
                    icon={fieldIcons.contact}
                    label="Contact Person"
                    value={viewDialog.enrollment.emergency_contact}
                  />
                  <InfoField
                    icon={fieldIcons.contact}
                    label="Relationship"
                    value={viewDialog.enrollment.emergency_relationship}
                  />
                  <InfoField
                    icon={fieldIcons.location}
                    label="Address"
                    value={viewDialog.enrollment.emergency_address}
                  />
                  <InfoField
                    icon={fieldIcons.contact}
                    label="Phone"
                    value={viewDialog.enrollment.emergency_phone}
                  />
                </div>
              </Section>

              {viewDialog.enrollment.status === 'pending' && (
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setViewDialog(prev => ({ ...prev, isOpen: false }));
                      showConfirmationDialog(
                        viewDialog.enrollment!.id,
                        'reject'
                      );
                    }}>
                    <X className="w-4 h-4 mr-2" />
                    Reject Application
                  </Button>
                  <Button
                    onClick={() => {
                      setViewDialog(prev => ({ ...prev, isOpen: false }));
                      showConfirmationDialog(
                        viewDialog.enrollment!.id,
                        'approve'
                      );
                    }}>
                    <Check className="w-4 h-4 mr-2" />
                    Approve Application
                  </Button>
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid gap-4 md:grid-cols-1 w-full">
          {Object.entries(groupedEnrollments).map(([course, enrollments]) => (
            <Card key={course}>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">
                  {/* {course}
                  <Badge className="ml-2">{enrollments.length}</Badge> */}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={columns}
                  data={enrollments.map(enrollment => ({
                    ...enrollment,
                    onView: () => handleViewDetails(enrollment),
                    onEdit: () => handleEdit(enrollment),
                    onApprove: () =>
                      showConfirmationDialog(enrollment.id, 'approve'),
                    onReject: () =>
                      showConfirmationDialog(enrollment.id, 'reject')
                  }))}
                  searchKey="student_no"
                />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="rounded-md border w-full">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Name</TableHead>
                <TableHead>Student No.</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(groupedEnrollments).map(
                ([course, enrollments]) => (
                  <TableRow key={course}>
                    <TableCell className="font-medium">{course}</TableCell>
                    <TableCell>{enrollments.length}</TableCell>
                    <TableCell>{course}</TableCell>
                    <TableCell>
                      {getStatusBadge(enrollments[0].status)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewDetails(enrollments[0])}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        {enrollments[0].status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() =>
                                showConfirmationDialog(
                                  enrollments[0].id,
                                  'approve'
                                )
                              }>
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() =>
                                showConfirmationDialog(
                                  enrollments[0].id,
                                  'reject'
                                )
                              }>
                              <X className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <EnrollmentForm
        useDialog={true}
        open={viewDialog.isOpen}
        onOpenChange={isOpen => {
          setViewDialog(prev => ({ ...prev, isOpen }));
          if (!isOpen) setViewLoading(false);
        }}
        onSuccess={fetchData}
        onError={() => {
          setViewLoading(false);
          toast.error('Failed to update enrollment');
        }}
      />
    </motion.div>
  );
}

interface InfoFieldProps {
  icon?: React.ReactNode;
  label: string;
  value: string | number;
}

function InfoField({ icon, label, value }: InfoFieldProps) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-semibold flex items-center gap-1">
        {icon && icon}
        {label}
      </label>
      <div className="p-2 bg-gray-50 rounded border">{value}</div>
    </div>
  );
}

const fieldIcons = {
  student: <User className="w-4 h-4" />,
  academic: <School className="w-4 h-4" />,
  date: <Calendar className="w-4 h-4" />,
  contact: <Phone className="w-4 h-4" />,
  location: <MapPin className="w-4 h-4" />,
  physical: <Heart className="w-4 h-4" />,
  family: <Users className="w-4 h-4" />,
  emergency: <AlertCircle className="w-4 h-4" />
};

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

function Section({ title, icon, children }: SectionProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>
      <div className="bg-gray-50 p-4 rounded-lg border">{children}</div>
    </div>
  );
}
