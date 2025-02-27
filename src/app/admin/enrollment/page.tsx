'use client';

import { useState, useEffect } from 'react';
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
  FileText
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

  const supabase = createClientComponentClient();

  const fetchEnrollments = async () => {
    try {
      setLoading(true);
      const {
        data: { session }
      } = await supabase.auth.getSession();
      if (!session) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, id')
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
          .order('created_at', { ascending: false });
        setEnrollments(data || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEnrollments();
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
      fetchEnrollments(); // Refresh the list
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

  const filteredEnrollments = enrollments.filter(enrollment => {
    const matchesSearch =
      enrollment.student_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
      enrollment.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      enrollment.last_name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      filterStatus === 'all' || enrollment.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

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

      <Card className="overflow-hidden border-none shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search applications..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            {isCoordinator && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <Filter className="w-4 h-4 mr-2" />
                    {filterStatus === 'all' ? 'All Status' : filterStatus}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setFilterStatus('all')}>
                    All Status
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterStatus('pending')}>
                    Pending
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterStatus('approved')}>
                    Approved
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterStatus('rejected')}>
                    Rejected
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardContent>
      </Card>

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
        viewMode === 'grid' ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2, 3, 4].map(i => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/3" />
                  <div className="h-3 bg-gray-200 rounded w-1/4" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-200 rounded" />
                    <div className="h-3 bg-gray-200 rounded" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">
                    <div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse" />
                  </TableHead>
                  <TableHead>
                    <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse" />
                  </TableHead>
                  <TableHead>
                    <div className="h-4 bg-gray-200 rounded w-1/3 animate-pulse" />
                  </TableHead>
                  <TableHead>
                    <div className="h-4 bg-gray-200 rounded w-1/4 animate-pulse" />
                  </TableHead>
                  <TableHead className="text-right">
                    <div className="h-4 bg-gray-200 rounded w-1/3 animate-pulse" />
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[1, 2, 3, 4].map(i => (
                  <TableRow key={i}>
                    <TableCell>
                      <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse" />
                    </TableCell>
                    <TableCell>
                      <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse" />
                    </TableCell>
                    <TableCell>
                      <div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse" />
                    </TableCell>
                    <TableCell>
                      <div className="h-4 bg-gray-200 rounded w-1/3 animate-pulse" />
                    </TableCell>
                    <TableCell>
                      <div className="h-4 bg-gray-200 rounded w-full animate-pulse" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )
      ) : viewMode === 'grid' ? (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredEnrollments.map(enrollment => (
            <Card key={enrollment.id}>
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  <span>{`${enrollment.first_name} ${enrollment.last_name}`}</span>
                  {getStatusBadge(enrollment.status)}
                </CardTitle>
                <CardDescription>{enrollment.student_no}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Course</span>
                    <span>{enrollment.course}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">MS</span>
                    <span>{enrollment.ms}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Submitted</span>
                    <span>
                      {new Date(enrollment.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button
                      className="flex-1"
                      variant="outline"
                      onClick={() => handleViewDetails(enrollment)}>
                      <Eye className="w-4 h-4 mr-2" />
                      View Details
                    </Button>
                    {isCoordinator && enrollment.status === 'pending' && (
                      <div className="flex gap-2 flex-1">
                        <Button
                          className="flex-1"
                          variant="default"
                          onClick={() =>
                            showConfirmationDialog(enrollment.id, 'approve')
                          }>
                          <Check className="w-4 h-4 mr-2" />
                          Approve
                        </Button>
                        <Button
                          className="flex-1"
                          variant="destructive"
                          onClick={() =>
                            showConfirmationDialog(enrollment.id, 'reject')
                          }>
                          <X className="w-4 h-4 mr-2" />
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="rounded-md border">
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
              {filteredEnrollments.map(enrollment => (
                <TableRow key={enrollment.id}>
                  <TableCell className="font-medium">
                    {`${enrollment.first_name} ${enrollment.last_name}`}
                  </TableCell>
                  <TableCell>{enrollment.student_no}</TableCell>
                  <TableCell>{enrollment.course}</TableCell>
                  <TableCell>{getStatusBadge(enrollment.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewDetails(enrollment)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      {enrollment.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() =>
                              showConfirmationDialog(enrollment.id, 'approve')
                            }>
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() =>
                              showConfirmationDialog(enrollment.id, 'reject')
                            }>
                            <X className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <EnrollmentForm
        open={viewDialog.isOpen}
        onOpenChange={isOpen => {
          setViewDialog(prev => ({ ...prev, isOpen }));
          if (!isOpen) setViewLoading(false);
        }}
        enrollment={viewDialog.enrollment}
        userId={userId}
        onSuccess={fetchEnrollments}
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
