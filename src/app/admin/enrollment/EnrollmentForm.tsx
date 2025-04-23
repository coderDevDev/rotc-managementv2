'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  locationService,
  type Region,
  type Province,
  type City,
  type Barangay
} from '@/lib/services/locationService';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Plus, Loader2 } from 'lucide-react';
import { enrollmentService } from '@/lib/services/enrollmentService';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

const COURSE_OPTIONS = [
  'BS Information Technology',
  'Bachelor of Technology and Livelihood Education (BTLE) Major Home Economics',
  'Bachelor of Science in Environmental Science',
  'Bachelor of Science in Agroforestry',
  'Bachelor of Science in Electronics Engineering',
  'Bachelor of Science in Electrical Engineering',
  'Bachelor of Science in Mechanical Engineering',
  'Bachelor of Engineering Technology Major in Electrical Engineering',
  'Bachelor of Engineering Technology Major in Electronics Engineering',
  'Bachelor of Engineering Technology Major in Mechanical Engineering',
  'Bachelor of Science in Industrial Technology Major in Mechanical Technology',
  'Bachelor of Science in Industrial Technology Major in Auto Trade',
  'BS Criminology',
  'Bachelor of Elementary Education (General)',
  'Bachelor of Secondary Education Major in English',
  'Bachelor of Secondary Education Major in Mathematics',
  'Bachelor of Secondary Education Major in Science',
  'Bachelor of Secondary Education Major in Filipino',
  'Bachelor of Science in Industrial Technology Major in Automotive Technology',
  'Bachelor of Science in Industrial Technology Major in Electrical Technology',
  'Bachelor of Science in Industrial Technology Major in Electronics Technology'
];

const CIVIL_STATUS_OPTIONS = [
  { value: 'single', label: 'Single' },
  { value: 'married', label: 'Married' },
  // { value: 'divorced', label: 'Divorced/Separated' },
  { value: 'widowed', label: 'Widowed' }
];

const schema = z
  .object({
    // Basic User Info
    email: z.string().email('Invalid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password must contain uppercase, lowercase and number'
      ),
    confirmPassword: z.string(),

    // Profile Info
    studentNo: z.string().min(1, 'Student No. is required'),
    firstName: z.string().min(1, 'First Name is required'),
    lastName: z.string().min(1, 'Last Name is required'),
    middleName: z.string().optional(),
    phoneNumber: z.string().optional(),
    dateOfBirth: z.string().min(1, 'Date of Birth is required'),
    gender: z.string().min(1, 'Gender is required'),
    civilStatus: z.string().optional(),

    // Enrollment Info
    ms: z.string().min(1, 'MS is required'),
    // date: z.string().min(1, 'Date is required'),
    course: z.enum(COURSE_OPTIONS as [string, ...string[]]),
    school: z.string().min(1, 'School is required'),
    address: z.object({
      region_id: z.string().min(1, 'Region is required'),
      province_id: z.string().min(1, 'Province is required'),
      city_id: z.string().min(1, 'City is required'),
      barangay_id: z.string().min(1, 'Barangay is required'),
      street: z.string().min(1, 'Street address is required'),
      zipCode: z.string().min(1, 'ZIP code is required')
    }),
    religion: z.string().min(1, 'Religion is required'),
    placeOfBirth: z.string().min(1, 'Place of Birth is required'),
    height: z.string().min(1, 'Height is required'),
    weight: z.string().min(1, 'Weight is required'),
    complexion: z.string().min(1, 'Complexion is required'),
    bloodType: z.string().min(1, 'Blood Type is required'),
    father: z.string().min(1, "Father's name is required"),
    fatherOccupation: z.string().min(1, "Father's occupation is required"),
    mother: z.string().min(1, "Mother's name is required"),
    motherOccupation: z.string().min(1, "Mother's occupation is required"),
    emergencyContact: z.string().min(1, 'Emergency contact is required'),
    emergencyRelationship: z
      .string()
      .min(1, 'Emergency relationship is required'),
    emergencyAddress: z.string().min(1, 'Emergency address is required'),
    emergencyPhone: z.string().min(1, 'Emergency phone is required'),
    militaryScience: z.string().optional(),
    willingToAdvance: z.boolean()
  })
  .refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword']
  });

type FormData = z.infer<typeof schema>;

interface EnrollmentFormProps {
  mode?: 'register' | 'enroll';
  onSuccess?: () => void;
  onError?: () => void;
  useDialog?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  enrollment?: Enrollment | null;
  viewOnly?: boolean;
}

// Define step fields for validation - aligned with schema and form fields
const stepFields = {
  1: [
    // Basic User Info & Profile Info
    'email',
    'password',
    'confirmPassword',
    'studentNo',
    'firstName',
    'lastName',
    'middleName',
    'phoneNumber',
    'gender',
    'dateOfBirth',
    'civilStatus'
  ],
  2: [
    // Location & Personal Background
    'address.region_id',
    'address.province_id',
    'address.city_id',
    'address.barangay_id',
    'address.street',
    'address.zipCode',
    'placeOfBirth',
    'religion'
  ],
  3: [
    // Academic Info
    'ms',
    'course',
    'school',
    'militaryScience',
    'willingToAdvance'
  ],
  4: [
    // Physical & Emergency Info
    'height',
    'weight',
    'complexion',
    'bloodType',
    'father',
    'fatherOccupation',
    'mother',
    'motherOccupation',
    'emergencyContact',
    'emergencyRelationship',
    'emergencyPhone',
    'emergencyAddress'
  ]
};

// Update the step labels to match content
const stepLabels = [
  'Basic Information',
  'Location & Background',
  'Academic Details',
  'Additional Information'
];

export default function EnrollmentForm({
  mode = 'enroll',
  useDialog = true,
  open,
  onOpenChange,
  onSuccess,
  onError,
  enrollment,
  viewOnly = false
}: EnrollmentFormProps) {
  const [loading, setLoading] = useState(false);
  const [regions, setRegions] = useState<Region[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [barangays, setBarangays] = useState<Barangay[]>([]);
  const supabase = createClientComponentClient();
  const [currentStep, setCurrentStep] = useState(1);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      willingToAdvance: false,
      gender: '',
      email: '',
      password: '',
      confirmPassword: '',
      studentNo: '',
      firstName: '',
      lastName: '',
      middleName: '',
      phoneNumber: '',
      dateOfBirth: '',
      placeOfBirth: '',
      religion: '',
      ms: '',
      course: '',
      school: '',
      militaryScience: '',
      height: '',
      weight: '',
      complexion: '',
      bloodType: '',
      father: '',
      fatherOccupation: '',
      mother: '',
      motherOccupation: '',
      emergencyContact: '',
      emergencyRelationship: '',
      emergencyPhone: '',
      emergencyAddress: '',
      address: {
        region_id: '',
        province_id: '',
        city_id: '',
        barangay_id: '',
        street: '',
        zipCode: ''
      },
      civilStatus: ''
    }
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = form;

  console.log({ errors });

  const selectedRegionId = watch('address.region_id');
  const selectedProvinceId = watch('address.province_id');
  const selectedCityId = watch('address.city_id');

  useEffect(() => {
    const fetchRegions = async () => {
      try {
        const data = await locationService.getRegions();
        setRegions(data);
      } catch (error) {
        console.error('Error fetching regions:', error);
        toast.error('Failed to load regions');
      }
    };
    fetchRegions();
  }, []);

  useEffect(() => {
    if (!selectedRegionId) {
      setProvinces([]);
      return;
    }
    const fetchProvinces = async () => {
      try {
        const data = await locationService.getProvinces(selectedRegionId);
        setProvinces(data);
        setValue('address.province_id', '');
        setValue('address.city_id', '');
        setValue('address.barangay_id', '');
      } catch (error) {
        console.error('Error fetching provinces:', error);
        toast.error('Failed to load provinces');
      }
    };
    fetchProvinces();
  }, [selectedRegionId, setValue]);

  useEffect(() => {
    if (!selectedProvinceId) {
      setCities([]);
      return;
    }
    const fetchCities = async () => {
      try {
        const data = await locationService.getCities(selectedProvinceId);
        setCities(data);
        setValue('address.city_id', '');
        setValue('address.barangay_id', '');
      } catch (error) {
        console.error('Error fetching cities:', error);
        toast.error('Failed to load cities');
      }
    };
    fetchCities();
  }, [selectedProvinceId, setValue]);

  useEffect(() => {
    if (!selectedCityId) {
      setBarangays([]);
      return;
    }
    const fetchBarangays = async () => {
      try {
        const data = await locationService.getBarangays(selectedCityId);
        setBarangays(data);
        setValue('address.barangay_id', '');
      } catch (error) {
        console.error('Error fetching barangays:', error);
        toast.error('Failed to load barangays');
      }
    };
    fetchBarangays();
  }, [selectedCityId, setValue]);

  useEffect(() => {
    if (enrollment) {
      // Set values for all fields from the enrollment data
      form.reset({
        email: enrollment.profile?.email || '',
        password: '', // Keep password empty for security
        confirmPassword: '',
        studentNo: enrollment.student_no || '',
        firstName: enrollment.first_name || '',
        lastName: enrollment.last_name || '',
        middleName: enrollment.middle_name || '',
        phoneNumber: enrollment.phone_number || '',
        dateOfBirth: enrollment.date_of_birth || '',
        placeOfBirth: enrollment.place_of_birth || '',
        gender: enrollment.gender || '',
        ms: enrollment.ms || '',
        course: enrollment.course as any, // Cast to satisfy TypeScript
        school: enrollment.school || '',
        militaryScience: enrollment.military_science || '',
        religion: enrollment.religion || '',
        height: enrollment.height || '',
        weight: enrollment.weight || '',
        complexion: enrollment.complexion || '',
        bloodType: enrollment.blood_type || '',
        father: enrollment.father || '',
        fatherOccupation: enrollment.father_occupation || '',
        mother: enrollment.mother || '',
        motherOccupation: enrollment.mother_occupation || '',
        emergencyContact: enrollment.emergency_contact || '',
        emergencyRelationship: enrollment.emergency_relationship || '',
        emergencyPhone: enrollment.emergency_phone || '',
        emergencyAddress: enrollment.emergency_address || '',
        willingToAdvance: enrollment.willing_to_advance || false,
        address: {
          region_id: enrollment.address?.region_id || '',
          province_id: enrollment.address?.province_id || '',
          city_id: enrollment.address?.city_id || '',
          barangay_id: enrollment.address?.barangay_id || '',
          street: enrollment.address?.street || '',
          zipCode: enrollment.address?.zip_code || ''
        },
        civilStatus: enrollment.civil_status || ''
      });

      // Also fetch location data based on selected region/province/etc.
      if (enrollment.address?.region_id) {
        // This will trigger the useEffect hooks to load provinces, cities, etc.
        setValue('address.region_id', enrollment.address.region_id);
      }
    }
  }, [enrollment, form, setValue]);

  // Function to validate current step
  const validateStep = async (step: number) => {
    const fields = stepFields[step as keyof typeof stepFields];
    const result = await form.trigger(fields as any);

    if (!result) {
      const stepErrors = fields
        .map(field => {
          const error = form.getFieldState(field as any).error;
          return error ? `${error.message}` : null;
        })
        .filter(Boolean);

      if (stepErrors.length > 0) {
        toast.error(stepErrors[0]); // Show first error message
      }
    }

    return result;
  };

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);

      if (mode === 'register') {
        // 1. Create user account with Supabase Auth
        const { data: authData, error: signUpError } =
          await supabase.auth.signUp({
            email: data.email,
            password: data.password,
            options: {
              data: {
                role: 'cadet',
                full_name: `${data.firstName} ${data.middleName || ''} ${
                  data.lastName
                }`.trim(),
                student_no: data.studentNo
              }
            }
          });

        if (signUpError) throw signUpError;
        if (!authData.user) throw new Error('User creation failed');

        // 2. Create profile record
        const { error: profileError, data: profileData } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            email: data.email,
            full_name: `${data.firstName} ${data.middleName || ''} ${
              data.lastName
            }`.trim(),
            student_no: data.studentNo,
            phone: data.phoneNumber,
            date_of_birth: data.dateOfBirth,
            gender: data.gender,
            course: data.course
          });

        if (profileError) throw profileError;

        // 3. Create enrollment record

        console.log({ profileData });
        const { error: enrollmentError } = await supabase
          .from('enrollments')
          .insert({
            profile_id: authData.user.id,

            student_no: data.studentNo,
            first_name: data.firstName,
            middle_name: data.middleName || '',
            last_name: data.lastName,
            ms: data.ms,
            date: data.date,
            course: data.course,
            school: data.school,
            religion: data.religion,
            place_of_birth: data.placeOfBirth,
            date_of_birth: data.dateOfBirth,
            height: data.height,
            weight: data.weight,
            complexion: data.complexion,
            blood_type: data.bloodType,
            father: data.father,
            father_occupation: data.fatherOccupation,
            mother: data.mother,
            mother_occupation: data.motherOccupation,
            emergency_contact: data.emergencyContact,
            emergency_relationship: data.emergencyRelationship,
            emergency_address: data.emergencyAddress,
            emergency_phone: data.emergencyPhone,
            military_science: data.militaryScience,
            willing_to_advance: data.willingToAdvance,
            status: 'approved',
            address: {
              region_id: data.address.region_id,
              province_id: data.address.province_id,
              city_id: data.address.city_id,
              barangay_id: data.address.barangay_id,
              street: data.address.street,
              zip_code: data.address.zipCode
            }
          });

        if (enrollmentError) throw enrollmentError;

        toast.success('Registration successful! Please check your email.');
      } else {
        // Handle regular enrollment (if needed)
        // ... existing enrollment logic
      }

      onSuccess?.();
    } catch (error) {
      console.error('Error:', error);
      toast.error(
        mode === 'register' ? 'Registration failed' : 'Enrollment failed'
      );
      onError?.();
    } finally {
      setLoading(false);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const nextStep = async () => {
    const isValid = await validateStep(currentStep);
    if (isValid && currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  // Adjust the form rendering to handle viewOnly mode
  const renderField = (
    label: string,
    value: string | number | null | undefined
  ) => (
    <div className="space-y-2">
      <h4 className="text-sm font-medium">{label}</h4>
      <div className="p-2 bg-gray-50 rounded border">
        {value || 'Not provided'}
      </div>
    </div>
  );

  const formContent =
    viewOnly && enrollment ? (
      // View-only version of the form
      <div className="space-y-6 px-2 py-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Personal Information</h3>
            {renderField('Student Number', enrollment.student_no)}
            {renderField(
              'Name',
              `${enrollment.first_name} ${enrollment.middle_name || ''} ${
                enrollment.last_name
              }`
            )}
            {renderField('Military Science', enrollment.ms)}
            {renderField('Course', enrollment.course)}
            {renderField('School', enrollment.school)}
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium">Contact Information</h3>
            {renderField('Email', enrollment.profile?.email)}
            {renderField('Phone', enrollment.phone_number)}
            {renderField(
              'Address',
              `${enrollment.address?.street}, ${enrollment.address?.barangay_name}, ${enrollment.address?.city_name}`
            )}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Physical Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {renderField('Height', enrollment.height)}
            {renderField('Weight', enrollment.weight)}
            {renderField('Blood Type', enrollment.blood_type)}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Emergency Contact</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderField('Contact Name', enrollment.emergency_contact)}
            {renderField('Relationship', enrollment.emergency_relationship)}
            {renderField('Phone', enrollment.emergency_phone)}
            {renderField('Address', enrollment.emergency_address)}
          </div>
        </div>

        <div className="pt-4 flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange?.(false)}>
            Close
          </Button>
        </div>
      </div>
    ) : (
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="relative flex flex-col min-h-[400px]">
          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex justify-between mb-2">
              {stepLabels.map((step, index) => (
                <div
                  key={step}
                  className={`flex flex-col items-center w-1/4 ${
                    currentStep > index
                      ? 'text-primary'
                      : 'text-muted-foreground'
                  }`}>
                  <div
                    className={`w-8 h-8 rounded-full border-2 flex items-center justify-center mb-2 
                  ${
                    currentStep > index
                      ? 'border-primary bg-primary text-white'
                      : currentStep === index
                      ? 'border-primary text-primary'
                      : 'border-muted-foreground'
                  }`}>
                    {currentStep > index ? '✓' : index + 1}
                  </div>
                  <span className="text-xs text-center">{step}</span>
                </div>
              ))}
            </div>
            <div className="w-full h-1 bg-muted relative">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${((currentStep - 1) / 3) * 100}%` }}
              />
            </div>
          </div>

          {/* Form Fields Container */}
          <div className="flex-1 overflow-y-auto mb-6">
            {/* Step 1: Personal Information */}
            <div className={currentStep === 1 ? 'block' : 'hidden'}>
              <div className="grid gap-4 md:grid-cols-2">
                {/* Basic User Info */}
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="email"
                          placeholder="Email address"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="password"
                          placeholder="Password"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="password"
                          placeholder="Confirm password"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Profile Info */}
                <FormField
                  control={form.control}
                  name="studentNo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Student Number</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Student number" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="First name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Last name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="middleName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Middle Name</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Middle name (optional)"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Phone number" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gender</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dateOfBirth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date of Birth</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="civilStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Civil Status</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select civil status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CIVIL_STATUS_OPTIONS.map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Step 2: Location & Personal Background */}
            <div className={currentStep === 2 ? 'block' : 'hidden'}>
              <div className="grid gap-4">
                <FormField
                  control={form.control}
                  name="address.region_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Region</FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select region" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {regions.map(region => (
                              <SelectItem key={region.id} value={region.id}>
                                {region.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address.province_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Province</FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select province" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {provinces.map(province => (
                              <SelectItem key={province.id} value={province.id}>
                                {province.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address.city_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select city" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {cities.map(city => (
                              <SelectItem key={city.id} value={city.id}>
                                {city.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address.barangay_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Barangay</FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select barangay" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {barangays.map(barangay => (
                              <SelectItem key={barangay.id} value={barangay.id}>
                                {barangay.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address.street"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Street</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Street address" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address.zipCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ZIP Code</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="ZIP code" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="placeOfBirth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Place of Birth</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Place of birth" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="religion"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Religion</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Religion" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Step 3: Academic Info */}
            <div className={currentStep === 3 ? 'block' : 'hidden'}>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="ms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Military Science</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select MS level" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="MS1">MS1</SelectItem>
                          <SelectItem value="MS2">MS2</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="course"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Course</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select course" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {COURSE_OPTIONS.map(course => (
                            <SelectItem key={course} value={course}>
                              {course}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="school"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>School</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="School name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="willingToAdvance"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Willing to Advance</FormLabel>
                        <FormDescription>
                          Check if you are willing to advance to the next MS
                          level
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Step 4: Physical & Emergency Info */}
            <div className={currentStep === 4 ? 'block' : 'hidden'}>
              <div className="grid gap-4 md:grid-cols-2">
                {/* Physical Information */}
                <FormField
                  control={form.control}
                  name="height"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Height (cm)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          placeholder="Height in cm"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="weight"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Weight (kg)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          placeholder="Weight in kg"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="complexion"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Complexion</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select complexion" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="fair">Fair</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="dark">Dark</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bloodType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Blood Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select blood type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="A+">A+</SelectItem>
                          <SelectItem value="A-">A-</SelectItem>
                          <SelectItem value="B+">B+</SelectItem>
                          <SelectItem value="B-">B-</SelectItem>
                          <SelectItem value="O+">O+</SelectItem>
                          <SelectItem value="O-">O-</SelectItem>
                          <SelectItem value="AB+">AB+</SelectItem>
                          <SelectItem value="AB-">AB-</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Parents Information */}
                <FormField
                  control={form.control}
                  name="father"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Father's Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Full name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="fatherOccupation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Father's Occupation</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Occupation" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="mother"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mother's Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Full name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="motherOccupation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mother's Occupation</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Occupation" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Emergency Contact Information */}
                <FormField
                  control={form.control}
                  name="emergencyContact"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Emergency Contact Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Full name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="emergencyRelationship"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Relationship to Contact</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. Parent, Sibling" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="emergencyPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Emergency Contact Phone</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Phone number" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="emergencyAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Emergency Contact Address</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Complete address" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>

          {/* Navigation Buttons - Fixed at bottom */}
          <div className="sticky bottom-0 bg-white pt-4 border-t mt-auto">
            <div className="flex justify-between items-center">
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 1 || loading}>
                Previous
              </Button>
              <div className="flex gap-2">
                {useDialog && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange?.(false)}
                    disabled={loading}>
                    Cancel
                  </Button>
                )}
                {currentStep < 4 ? (
                  <Button type="button" onClick={nextStep}>
                    Next
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={loading}
                    onClick={async e => {
                      e.preventDefault();
                      const isValid = await validateStep(4);
                      if (isValid) {
                        form.handleSubmit(onSubmit)(e);
                      } else {
                        toast.error(
                          'Please fill in all required fields correctly'
                        );
                      }
                    }}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {mode === 'register'
                          ? 'Registering...'
                          : 'Submitting...'}
                      </>
                    ) : mode === 'register' ? (
                      'Complete Registration'
                    ) : (
                      'Submit Enrollment'
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </form>
      </Form>
    );

  if (useDialog) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogTrigger asChild>
          {/* <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Enrollment
          </Button> */}
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {viewOnly
                ? 'Enrollment Details'
                : mode === 'register'
                ? 'Cadet Registration'
                : 'New Enrollment'}
            </DialogTitle>
          </DialogHeader>
          {formContent}
        </DialogContent>
      </Dialog>
    );
  }

  return formContent;
}
