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
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { gradeService } from '@/lib/services/gradeService';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { GradeEntry, GradeCategory } from '@/lib/types/grade';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

const supabase = createClientComponentClient();

const schema = z.object({
  user_id: z.string().min(1, 'Student is required'),
  category_id: z.enum(['academics', 'leadership', 'physical_fitness']),
  score: z.number().min(0).max(100),
  instructor_notes: z.string().optional(),
  term: z.string().min(1, 'Term is required')
});

type FormData = z.infer<typeof schema>;

interface GradeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  grade?: GradeEntry;
  onSuccess: () => void;
  defaultTerm?: string;
  defaultUserId?: string;
}

export function GradeForm({
  open,
  onOpenChange,
  grade,
  onSuccess,
  defaultTerm,
  defaultUserId
}: GradeFormProps) {
  const [activeTab, setActiveTab] = useState<GradeCategory>('academics');
  const [students, setStudents] = useState<
    Array<{ id: string; full_name: string; student_no: string }>
  >([]);
  const [loading, setLoading] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      user_id: defaultUserId || '',
      category_id: 'academics',
      score: 0,
      instructor_notes: '',
      term: defaultTerm || new Date().getFullYear() + '-1'
    }
  });

  // Fetch students when form opens
  useEffect(() => {
    if (open) {
      const fetchStudents = async () => {
        try {
          setLoading(true);
          const data = await gradeService.getStudents();
          setStudents(data);
        } catch (error) {
          console.error('Error fetching students:', error);
          toast.error('Failed to load students');
        } finally {
          setLoading(false);
        }
      };
      fetchStudents();
    }
  }, [open]);

  // Set form values when editing
  useEffect(() => {
    if (grade) {
      form.reset({
        user_id: grade.user_id,
        category_id: grade.category_id,
        score: grade.score,
        instructor_notes: grade.instructor_notes || '',
        term: grade.term
      });
      setActiveTab(grade.category_id);
    }
  }, [grade, form]);

  const onSubmit = async (data: FormData) => {
    try {
      // Get current session user as instructor
      const {
        data: { session }
      } = await supabase.auth.getSession();

      if (!session?.user?.id) {
        toast.error('You must be logged in to add grades');
        return;
      }

      const gradeData = {
        ...data,
        instructor_id: session.user.id
      };

      if (grade) {
        await gradeService.updateGrade(grade.id, gradeData);
        toast.success('Grade updated successfully');
      } else {
        await gradeService.addGrade(gradeData);
        toast.success('Grade added successfully');
      }
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving grade:', error);
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('Failed to save grade');
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>{grade ? 'Edit Grade' : 'Add Grade'}</DialogTitle>
        </DialogHeader>
        <Tabs
          value={activeTab}
          onValueChange={val => setActiveTab(val as GradeCategory)}>
          <TabsList className="grid w-full grid-cols-3 bg-primary text-white">
            <TabsTrigger value="academics">Academics</TabsTrigger>
            <TabsTrigger value="leadership">Leadership</TabsTrigger>
            <TabsTrigger value="physical_fitness">Physical Fitness</TabsTrigger>
          </TabsList>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4 mt-4">
              <FormField
                control={form.control}
                name="user_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Student</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={!!grade || loading}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a student" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {loading ? (
                          <SelectItem disabled value="loading">
                            Loading students...
                          </SelectItem>
                        ) : students.length === 0 ? (
                          <SelectItem disabled value="empty">
                            No students found
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
                name="score"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Score</FormLabel>
                    <FormControl>
                      <div className="space-y-4">
                        <Slider
                          min={0}
                          max={100}
                          step={1}
                          value={[field.value]}
                          onValueChange={([value]) => field.onChange(value)}
                        />
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            {...field}
                            onChange={e =>
                              field.onChange(Number(e.target.value))
                            }
                            className="w-20"
                          />
                          <span className="text-sm text-muted-foreground">
                            / 100
                          </span>
                        </div>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="instructor_notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Add any comments or feedback..."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <input
                type="hidden"
                {...form.register('category_id')}
                value={activeTab}
              />

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {grade ? 'Update' : 'Add'} Grade
                </Button>
              </div>
            </form>
          </Form>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
