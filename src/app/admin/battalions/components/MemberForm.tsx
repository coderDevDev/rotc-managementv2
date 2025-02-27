'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import {
  battalionService,
  type BattalionMember
} from '@/lib/services/battalionService';
import { toast } from 'sonner';
import { useEffect, useState } from 'react';
import { studentService, type Student } from '@/lib/services/studentService';

const schema = z.object({
  user_id: z.string().min(1, 'Member is required'),
  role: z.enum(['commander', 'platoon_leader', 'squad_leader', 'cadet']),
  rank: z.string().min(1, 'Rank is required')
});

type FormData = z.infer<typeof schema>;

interface MemberFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  battalionId: string;
  member?: BattalionMember;
  onSuccess: () => void;
}

const RANKS = [
  'Cadet',
  'Cadet Corporal',
  'Cadet Sergeant',
  'Cadet Staff Sergeant',
  'Cadet Master Sergeant',
  'Cadet Second Lieutenant',
  'Cadet First Lieutenant',
  'Cadet Captain'
];

export function MemberForm({
  open,
  onOpenChange,
  battalionId,
  member,
  onSuccess
}: MemberFormProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [availableStudents, setAvailableStudents] = useState<Student[]>([]);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      role: 'cadet',
      rank: 'Cadet'
    }
  });

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const allStudents = await studentService.getStudents();

      // Filter out students who are already in battalions
      const availableStudents = [];
      for (const student of allStudents) {
        try {
          const exists = await battalionService.checkMemberExists(student.id);
          if (!exists || (member && member.user_id === student.id)) {
            // Include current member in the list when editing
            availableStudents.push(student);
          }
        } catch (error) {
          console.error('Error checking student:', error);
          // Continue with other students even if one check fails
          continue;
        }
      }

      setStudents(availableStudents);
    } catch (error) {
      console.error('Error fetching students:', error);
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchStudents();
    }
  }, [open]);

  useEffect(() => {
    if (member) {
      form.reset({
        user_id: member.user_id,
        role: member.role,
        rank: member.rank
      });
    } else {
      form.reset({
        user_id: '',
        role: 'cadet',
        rank: 'Cadet'
      });
    }
  }, [member, form]);

  const onSubmit = async (data: FormData) => {
    try {
      if (member) {
        await battalionService.updateMember(battalionId, member.user_id, data);
        toast.success('Member updated successfully');
      } else {
        try {
          await battalionService.addMember({
            battalion_id: battalionId,
            user_id: data.user_id,
            role: data.role,
            rank: data.rank
          });
          toast.success('Member added successfully');
        } catch (error) {
          if (
            error instanceof Error &&
            error.message === 'User is already assigned to a battalion'
          ) {
            toast.error('This cadet is already assigned to a battalion');
            return;
          }
          throw error;
        }
      }
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving member:', error);
      toast.error('Failed to save member');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{member ? 'Edit Member' : 'Add Member'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="user_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Cadet</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value || undefined}
                    disabled={!!member || loading}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            loading ? 'Loading...' : 'Select a cadet'
                          }
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {loading ? (
                        <SelectItem disabled value="loading">
                          Loading cadets...
                        </SelectItem>
                      ) : students.length === 0 ? (
                        <SelectItem disabled value="empty">
                          No available cadets found
                        </SelectItem>
                      ) : (
                        students.map(student => (
                          <SelectItem key={student.id} value={student.id}>
                            {student.full_name} ({student.student_no})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="commander">Commander</SelectItem>
                      <SelectItem value="platoon_leader">
                        Platoon Leader
                      </SelectItem>
                      <SelectItem value="squad_leader">Squad Leader</SelectItem>
                      <SelectItem value="cadet">Cadet</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="rank"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rank</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select rank" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {RANKS.map(rank => (
                        <SelectItem key={rank} value={rank}>
                          {rank}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
