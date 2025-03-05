import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  User,
  GraduationCap,
  MapPin,
  Heart,
  Users,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';

interface EnrollmentDetailsProps {
  enrollment: any;
}

// Section component for reusability
const Section = ({ title, icon, children }: any) => (
  <div className="space-y-4">
    <div className="flex items-center gap-2">
      {icon}
      <h3 className="text-lg font-semibold">{title}</h3>
    </div>
    {children}
  </div>
);

// Info field component for consistent styling
const InfoField = ({ icon, label, value }: any) => (
  <div className="space-y-1">
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      {icon}
      <span>{label}</span>
    </div>
    <p className="font-medium">{value}</p>
  </div>
);

const fieldIcons = {
  student: <User className="w-4 h-4" />,
  academic: <GraduationCap className="w-4 h-4" />,
  location: <MapPin className="w-4 h-4" />,
  physical: <Heart className="w-4 h-4" />,
  family: <Users className="w-4 h-4" />,
  contact: <AlertCircle className="w-4 h-4" />,
  date: <Clock className="w-4 h-4" />
};

export default function EnrollmentDetails({
  enrollment
}: EnrollmentDetailsProps) {
  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return (
          <Badge variant="success" className="gap-1">
            <CheckCircle className="w-3 h-3" />
            Enrolled
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
          <Badge className="gap-1 bg-yellow-500">
            <Clock className="w-3 h-3" />
            Pending
          </Badge>
        );
    }
  };

  return (
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
        {getStatusBadge(enrollment.status)}
      </div>

      <Section title="Basic Information" icon={<User className="w-5 h-5" />}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <InfoField
            icon={fieldIcons.student}
            label="Student No."
            value={enrollment.student_no}
          />
          <InfoField
            icon={fieldIcons.academic}
            label="MS Level"
            value={enrollment.ms}
          />
          <InfoField
            icon={fieldIcons.date}
            label="Application Date"
            value={new Date(enrollment.created_at).toLocaleDateString()}
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
            value={enrollment.first_name}
          />
          <InfoField
            icon={fieldIcons.student}
            label="Middle Name"
            value={enrollment.middle_name || 'N/A'}
          />
          <InfoField
            icon={fieldIcons.student}
            label="Last Name"
            value={enrollment.last_name}
          />
          <InfoField
            icon={fieldIcons.academic}
            label="Course"
            value={enrollment.course}
          />
          <InfoField
            icon={fieldIcons.academic}
            label="School"
            value={enrollment.school}
          />
          <InfoField
            icon={fieldIcons.student}
            label="Religion"
            value={enrollment.religion}
          />
        </div>
      </Section>

      <Section title="Address" icon={<MapPin className="w-5 h-5" />}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoField
            icon={fieldIcons.location}
            label="Complete Address"
            value={`${enrollment.address.street}, ${enrollment.address.barangay_name}, ${enrollment.address.city_name}, ${enrollment.address.province_name}, ${enrollment.address.region_name}`}
          />
          <InfoField
            icon={fieldIcons.location}
            label="ZIP Code"
            value={enrollment.address.zip_code}
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
            value={enrollment.height}
          />
          <InfoField
            icon={fieldIcons.physical}
            label="Weight"
            value={enrollment.weight}
          />
          <InfoField
            icon={fieldIcons.physical}
            label="Complexion"
            value={enrollment.complexion}
          />
          <InfoField
            icon={fieldIcons.physical}
            label="Blood Type"
            value={enrollment.blood_type}
          />
        </div>
      </Section>

      <Section title="Family Background" icon={<Users className="w-5 h-5" />}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoField
            icon={fieldIcons.family}
            label="Father's Name"
            value={enrollment.father}
          />
          <InfoField
            icon={fieldIcons.family}
            label="Father's Occupation"
            value={enrollment.father_occupation}
          />
          <InfoField
            icon={fieldIcons.family}
            label="Mother's Name"
            value={enrollment.mother}
          />
          <InfoField
            icon={fieldIcons.family}
            label="Mother's Occupation"
            value={enrollment.mother_occupation}
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
            value={enrollment.emergency_contact}
          />
          <InfoField
            icon={fieldIcons.contact}
            label="Relationship"
            value={enrollment.emergency_relationship}
          />
          <InfoField
            icon={fieldIcons.location}
            label="Address"
            value={enrollment.emergency_address}
          />
          <InfoField
            icon={fieldIcons.contact}
            label="Phone"
            value={enrollment.emergency_phone}
          />
        </div>
      </Section>
    </div>
  );
}
