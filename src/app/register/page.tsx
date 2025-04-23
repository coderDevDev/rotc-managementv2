'use client';

import { toast } from 'sonner';
import EnrollmentForm from '@/app/admin/enrollment/EnrollmentForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/5">
      <div className="container relative flex-col items-center justify-center grid lg:max-w-none lg:grid-cols-[450px,1fr] lg:px-0 min-h-screen">
        {/* Left side - Hero Info */}
        <div className="relative hidden lg:flex h-full flex-col bg-muted p-10 text-white dark:border-r">
          <div className="absolute inset-0 bg-primary/90" />
          <div className="relative z-20 flex items-center text-lg font-medium">
            <Image
              src="/images/LOGO.png"
              alt="ROTC Logo"
              width={40}
              height={40}
              className="mr-2"
            />
            CBSUA ROTC
          </div>
          <div className="relative z-20 mt-2">
            <h2 className="text-4xl font-bold mb-6">
              Welcome to CBSUA ROTC Program
            </h2>
            <div className="space-y-4">
              <p className="text-lg opacity-90">
                Join our prestigious ROTC program and embark on a journey of:
              </p>
              <ul className="space-y-3 text-base opacity-85">
                <li className="flex items-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-white mr-2" />
                  Leadership Development
                </li>
                <li className="flex items-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-white mr-2" />
                  Physical Training
                </li>
                <li className="flex items-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-white mr-2" />
                  Military Education
                </li>
                <li className="flex items-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-white mr-2" />
                  Character Building
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Right side - Form */}
        <div className="lg:p-8">
          <div className="mx-auto flex w-full flex-col justify-center max-w-[800px]">
            <Card className="border-0 shadow-lg">
              <CardHeader className="space-y-1 text-center pb-8">
                <div className="lg:hidden mb-4">
                  <Image
                    src="/LOGO.png"
                    alt="ROTC Logo"
                    width={80}
                    height={80}
                    className="mx-auto"
                  />
                </div>
                <CardTitle className="text-2xl font-bold tracking-tight">
                  ROTC Enrollment
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Join our ROTC program and develop leadership skills
                </p>
              </CardHeader>
              <CardContent className="p-6">
                <EnrollmentForm
                  viewOnly={false}
                  mode="register"
                  useDialog={false}
                  onSuccess={() => {
                    toast.success(
                      'Registration successful! Please check your email.'
                    );
                    window.location.href = '/login';
                  }}
                  onError={() => {
                    toast.error('Registration failed. Please try again.');
                  }}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
