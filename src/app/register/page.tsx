'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { authService } from '@/lib/services/authService';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  locationService,
  type Region,
  type Province,
  type City,
  type Barangay
} from '@/lib/services/locationService';
import { useSearchParams } from 'next/navigation';
import { RoleSelector } from '@/components/auth/RoleSelector';

const registerSchema = z
  .object({
    fullName: z.string().min(2, 'Full name is required'),
    email: z.string().email('Invalid email address'),
    phone: z.string().min(10, 'Phone number is required'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password must contain at least one uppercase letter, one lowercase letter, and one number'
      ),
    confirmPassword: z.string(),
    username: z.string().optional(),
    dateOfBirth: z.string().optional(),
    gender: z.string().optional(),
    address: z.object({
      region_id: z.string().min(1, 'Region is required'),
      province_id: z.string().min(1, 'Province is required'),
      city_id: z.string().min(1, 'City is required'),
      barangay_id: z.string().min(1, 'Barangay is required'),
      street: z.string().min(1, 'Street address is required'),
      zipCode: z.string().min(1, 'ZIP code is required')
    })
  })
  .refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword']
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const searchParams = useSearchParams();
  const [role, setRole] = useState<'user' | 'supplier' | 'admin'>(
    (searchParams.get('role') as 'user' | 'supplier' | 'admin') || 'user'
  );
  const [loading, setLoading] = useState(false);
  const [regions, setRegions] = useState<Region[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [barangays, setBarangays] = useState<Barangay[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema)
  });

  // Watch address fields for cascading dropdowns
  const selectedRegionId = watch('address.region_id');
  const selectedProvinceId = watch('address.province_id');
  const selectedCityId = watch('address.city_id');

  // Fetch regions on mount
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

  // Fetch provinces when region changes
  useEffect(() => {
    if (!selectedRegionId) {
      setProvinces([]);
      return;
    }
    const fetchProvinces = async () => {
      try {
        const data = await locationService.getProvinces(selectedRegionId);
        setProvinces(data);
        // Reset dependent fields
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

  // Fetch cities when province changes
  useEffect(() => {
    if (!selectedProvinceId) {
      setCities([]);
      return;
    }
    const fetchCities = async () => {
      try {
        const data = await locationService.getCities(selectedProvinceId);
        setCities(data);
        // Reset dependent fields
        setValue('address.city_id', '');
        setValue('address.barangay_id', '');
      } catch (error) {
        console.error('Error fetching cities:', error);
        toast.error('Failed to load cities');
      }
    };
    fetchCities();
  }, [selectedProvinceId, setValue]);

  // Fetch barangays when city changes
  useEffect(() => {
    if (!selectedCityId) {
      setBarangays([]);
      return;
    }
    const fetchBarangays = async () => {
      try {
        const data = await locationService.getBarangays(selectedCityId);
        setBarangays(data);
        // Reset dependent field
        setValue('address.barangay_id', '');
      } catch (error) {
        console.error('Error fetching barangays:', error);
        toast.error('Failed to load barangays');
      }
    };
    fetchBarangays();
  }, [selectedCityId, setValue]);

  const onSubmit = async (data: RegisterFormData) => {
    try {
      setLoading(true);

      // Get the names for the selected IDs
      const selectedRegion = regions.find(r => r.id === data.address.region_id);
      const selectedProvince = provinces.find(
        p => p.id === data.address.province_id
      );
      const selectedCity = cities.find(c => c.id === data.address.city_id);
      const selectedBarangay = barangays.find(
        b => b.id === data.address.barangay_id
      );

      await authService.register({
        email: data.email,
        password: data.password,
        role: role,
        metadata: {
          full_name: data.fullName,
          phone: data.phone,
          username: data.username,
          date_of_birth: data.dateOfBirth,
          gender: data.gender,
          address: {
            region_id: data.address.region_id,
            region_name: selectedRegion?.name || '',
            province_id: data.address.province_id,
            province_name: selectedProvince?.name || '',
            city_id: data.address.city_id,
            city_name: selectedCity?.name || '',
            barangay_id: data.address.barangay_id,
            barangay_name: selectedBarangay?.name || '',
            street: data.address.street,
            zip_code: data.address.zipCode
          }
        }
      });

      toast.success(
        'Registration successful! Please check your email to verify your account.'
      );
      window.location.href = `/login?role=${role}`;
    } catch (error) {
      console.error('Registration error:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to register'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl w-full space-y-8">
        <div className="mt-8 bg-white py-8 px-4 shadow-xl sm:rounded-lg sm:px-10 border border-primary">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-semibold text-slate-900">
              Create an Account
            </h1>
            {/* <p className="mt-2 text-sm text-slate-600">
              Fill in your details to create your account
            </p> */}
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Basic Fields */}
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                {...register('fullName')}
                className={errors.fullName ? 'border-red-500' : ''}
                // placeholder="Cadet Juan Dela Cruz"
              />
              {errors.fullName && (
                <p className="text-xs text-red-500">
                  {errors.fullName.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  {...register('email')}
                  className={errors.email ? 'border-red-500' : ''}
                  placeholder="john@example.com"
                />
                {errors.email && (
                  <p className="text-xs text-red-500">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  {...register('phone')}
                  className={errors.phone ? 'border-red-500' : ''}
                  placeholder="+63"
                />
                {errors.phone && (
                  <p className="text-xs text-red-500">{errors.phone.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  {...register('password')}
                  className={errors.password ? 'border-red-500' : ''}
                />
                {errors.password && (
                  <p className="text-xs text-red-500">
                    {errors.password.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  {...register('confirmPassword')}
                  className={errors.confirmPassword ? 'border-red-500' : ''}
                />
                {errors.confirmPassword && (
                  <p className="text-xs text-red-500">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>
            </div>

            {/* Optional Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* <div className="space-y-2">
                <Label htmlFor="username">Username (Optional)</Label>
                <Input
                  id="username"
                  {...register('username')}
                  placeholder="johndoe"
                />
              </div> */}

              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">Date of Birth</Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  {...register('dateOfBirth')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gender">Gender</Label>
                <Select onValueChange={value => setValue('gender', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    {/* <SelectItem value="other">Other</SelectItem>
                    <SelectItem value="prefer_not_to_say">
                      Prefer not to say
                    </SelectItem> */}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Address Fields */}
            <div className="space-y-4">
              <h3 className="font-medium text-slate-900">
                Address Information
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="region">Region</Label>
                  <Select
                    onValueChange={value =>
                      setValue('address.region_id', value)
                    }
                    value={watch('address.region_id')}>
                    <SelectTrigger
                      className={
                        errors.address?.region_id ? 'border-red-500' : ''
                      }>
                      <SelectValue placeholder="Select region" />
                    </SelectTrigger>
                    <SelectContent>
                      {regions.map(region => (
                        <SelectItem key={region.id} value={region.id}>
                          {region.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.address?.region_id && (
                    <p className="text-xs text-red-500">
                      {errors.address.region_id.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="province">Province</Label>
                  <Select
                    onValueChange={value =>
                      setValue('address.province_id', value)
                    }
                    value={watch('address.province_id')}
                    disabled={!selectedRegionId}>
                    <SelectTrigger
                      className={
                        errors.address?.province_id ? 'border-red-500' : ''
                      }>
                      <SelectValue placeholder="Select province" />
                    </SelectTrigger>
                    <SelectContent>
                      {provinces.map(province => (
                        <SelectItem key={province.id} value={province.id}>
                          {province.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.address?.province_id && (
                    <p className="text-xs text-red-500">
                      {errors.address.province_id.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City/Municipality</Label>
                  <Select
                    onValueChange={value => setValue('address.city_id', value)}
                    value={watch('address.city_id')}
                    disabled={!selectedProvinceId}>
                    <SelectTrigger
                      className={
                        errors.address?.city_id ? 'border-red-500' : ''
                      }>
                      <SelectValue placeholder="Select city" />
                    </SelectTrigger>
                    <SelectContent>
                      {cities.map(city => (
                        <SelectItem key={city.id} value={city.id}>
                          {city.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.address?.city_id && (
                    <p className="text-xs text-red-500">
                      {errors.address.city_id.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="barangay">Barangay</Label>
                  <Select
                    onValueChange={value =>
                      setValue('address.barangay_id', value)
                    }
                    value={watch('address.barangay_id')}
                    disabled={!selectedCityId}>
                    <SelectTrigger
                      className={
                        errors.address?.barangay_id ? 'border-red-500' : ''
                      }>
                      <SelectValue placeholder="Select barangay" />
                    </SelectTrigger>
                    <SelectContent>
                      {barangays.map(barangay => (
                        <SelectItem key={barangay.id} value={barangay.id}>
                          {barangay.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.address?.barangay_id && (
                    <p className="text-xs text-red-500">
                      {errors.address.barangay_id.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="street">Street Address</Label>
                <Input
                  id="street"
                  {...register('address.street')}
                  className={errors.address?.street ? 'border-red-500' : ''}
                  placeholder="House/Unit No., Street Name"
                />
                {errors.address?.street && (
                  <p className="text-xs text-red-500">
                    {errors.address.street.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="zipCode">ZIP/Postal Code</Label>
                <Input
                  id="zipCode"
                  {...register('address.zipCode')}
                  className={errors.address?.zipCode ? 'border-red-500' : ''}
                  placeholder="ZIP Code"
                />
                {errors.address?.zipCode && (
                  <p className="text-xs text-red-500">
                    {errors.address.zipCode.message}
                  </p>
                )}
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-primary py-2 text-white hover:bg-primary/90 disabled:bg-primary/50">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin inline" />
                  <span>Creating account...</span>
                </>
              ) : (
                'Create Account'
              )}
            </Button>

            <p className="text-center text-sm text-gray-600">
              Already have an account?{' '}
              <a
                href={`/login?role=${role}`}
                className="font-medium text-primary hover:text-primary/80">
                Sign in
              </a>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
