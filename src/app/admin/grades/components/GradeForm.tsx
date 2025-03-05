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
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

const supabase = createClientComponentClient();

const schema = z.object({
  user_id: z.string().min(1, 'Student is required'),
  academics_score: z.number().min(0).max(100),
  leadership_score: z.number().min(0).max(100),
  physical_fitness_score: z.number().min(0).max(100),
  instructor_notes: z.string().optional()
});

interface GradeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  grade?: GradeEntry | null;
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
  const [activeTab, setActiveTab] = useState<
    'academics' | 'leadership' | 'physical_fitness'
  >('academics');
  const [students, setStudents] = useState<
    Array<{ id: string; full_name: string; student_no: string }>
  >([]);
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      user_id: defaultUserId || '',
      academics_score: 0,
      leadership_score: 0,
      physical_fitness_score: 0,
      instructor_notes: ''
    }
  });

  useEffect(() => {
    if (open) {
      const fetchStudents = async () => {
        try {
          setLoading(true);
          const [studentsData, gradesData] = await Promise.all([
            gradeService.getStudents(),
            gradeService.getGrades({ term: defaultTerm })
          ]);

          // Filter out students who already have grades for this term
          const studentsWithGrades = new Set(gradesData.map(grade => grade.id));

          const availableStudents = studentsData.filter(
            student =>
              !studentsWithGrades.has(student.id) || student.id === grade?.id
          );

          setStudents(availableStudents);
        } catch (error) {
          console.error('Error fetching students:', error);
          toast.error('Failed to load students');
        } finally {
          setLoading(false);
        }
      };
      fetchStudents();
    }
  }, [open, defaultTerm, grade]);

  useEffect(() => {
    if (grade) {
      form.reset({
        user_id: grade.id,
        academics_score: grade.grades.academics?.score || 0,
        leadership_score: grade.grades.leadership?.score || 0,
        physical_fitness_score: grade.grades.physical_fitness?.score || 0,
        instructor_notes: grade.instructor_notes || ''
      });
    }
  }, [grade, form]);

  const onSubmit = async (data: z.infer<typeof schema>) => {
    try {
      setLoading(true);
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) throw new Error('No user session');

      const instructor_id = session.session.user.id;
      const term = defaultTerm || (await gradeService.getCurrentTerm());

      if (grade) {
        await gradeService.updateGrades(grade.id, {
          academics: {
            score: data.academics_score,
            instructor_id
          },
          leadership: {
            score: data.leadership_score,
            instructor_id
          },
          physical_fitness: {
            score: data.physical_fitness_score,
            instructor_id
          },
          instructor_notes: data.instructor_notes,
          term
        });
        toast.success('Grades updated successfully');
      } else {
        const gradeEntries = [
          {
            user_id: data.user_id,
            instructor_id,
            category_id: 'academics' as const,
            term,
            score: data.academics_score,
            instructor_notes: data.instructor_notes
          },
          {
            user_id: data.user_id,
            instructor_id,
            category_id: 'leadership' as const,
            term,
            score: data.leadership_score,
            instructor_notes: data.instructor_notes
          },
          {
            user_id: data.user_id,
            instructor_id,
            category_id: 'physical_fitness' as const,
            term,
            score: data.physical_fitness_score,
            instructor_notes: data.instructor_notes
          }
        ];

        await Promise.all(
          gradeEntries.map(gradeData => gradeService.addGrade(gradeData))
        );
        toast.success('Grades added successfully');
      }
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving grades:', error);
      toast.error('Failed to save grades');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {grade ? 'Edit Grade Entry' : 'Add Grade Entry'}
          </DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="academics">
          <TabsList className="grid w-full grid-cols-3 bg-primary text-white">
            <TabsTrigger value="academics">Academics</TabsTrigger>
            <TabsTrigger value="leadership">Leadership</TabsTrigger>
            <TabsTrigger value="physical_fitness">Physical Fitness</TabsTrigger>
          </TabsList>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                            {grade
                              ? 'No student found'
                              : 'All students already have grades for this term'}
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

              <TabsContent value="academics" className="space-y-4">
                <FormField
                  control={form.control}
                  name="academics_score"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Academic Score (%)</FormLabel>
                      <div className="space-y-2">
                        <div className="flex items-center gap-4">
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              {...field}
                              onChange={e => {
                                const value = Math.min(
                                  100,
                                  Math.max(0, Number(e.target.value))
                                );
                                field.onChange(value);
                              }}
                              className="w-24"
                            />
                          </FormControl>
                          <span className="text-sm text-gray-500">
                            {field.value}%
                          </span>
                        </div>
                        <Progress
                          value={field.value}
                          className={cn(
                            'h-2',
                            field.value >= 90
                              ? 'bg-green-100'
                              : field.value >= 75
                              ? 'bg-blue-100'
                              : 'bg-red-100'
                          )}
                          indicatorClassName={cn(
                            field.value >= 90
                              ? 'bg-green-500'
                              : field.value >= 75
                              ? 'bg-blue-500'
                              : 'bg-red-500'
                          )}
                        />
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>Failing</span>
                          <span>Passing</span>
                          <span>Excellent</span>
                        </div>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="leadership" className="space-y-4">
                <FormField
                  control={form.control}
                  name="leadership_score"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Leadership Score (%)</FormLabel>
                      <div className="space-y-2">
                        <div className="flex items-center gap-4">
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              {...field}
                              onChange={e => {
                                const value = Math.min(
                                  100,
                                  Math.max(0, Number(e.target.value))
                                );
                                field.onChange(value);
                              }}
                              className="w-24"
                            />
                          </FormControl>
                          <span className="text-sm text-gray-500">
                            {field.value}%
                          </span>
                        </div>
                        <Progress
                          value={field.value}
                          className={cn(
                            'h-2',
                            field.value >= 90
                              ? 'bg-green-100'
                              : field.value >= 75
                              ? 'bg-blue-100'
                              : 'bg-red-100'
                          )}
                          indicatorClassName={cn(
                            field.value >= 90
                              ? 'bg-green-500'
                              : field.value >= 75
                              ? 'bg-blue-500'
                              : 'bg-red-500'
                          )}
                        />
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>Failing</span>
                          <span>Passing</span>
                          <span>Excellent</span>
                        </div>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="physical_fitness" className="space-y-4">
                <FormField
                  control={form.control}
                  name="physical_fitness_score"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Physical Fitness Score (%)</FormLabel>
                      <div className="space-y-2">
                        <div className="flex items-center gap-4">
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              {...field}
                              onChange={e => {
                                const value = Math.min(
                                  100,
                                  Math.max(0, Number(e.target.value))
                                );
                                field.onChange(value);
                              }}
                              className="w-24"
                            />
                          </FormControl>
                          <span className="text-sm text-gray-500">
                            {field.value}%
                          </span>
                        </div>
                        <Progress
                          value={field.value}
                          className={cn(
                            'h-2',
                            field.value >= 90
                              ? 'bg-green-100'
                              : field.value >= 75
                              ? 'bg-blue-100'
                              : 'bg-red-100'
                          )}
                          indicatorClassName={cn(
                            field.value >= 90
                              ? 'bg-green-500'
                              : field.value >= 75
                              ? 'bg-blue-500'
                              : 'bg-red-500'
                          )}
                        />
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>Failing</span>
                          <span>Passing</span>
                          <span>Excellent</span>
                        </div>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

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

              <div className="flex justify-end gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>Save</>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
