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
import { Loader2 } from 'lucide-react';
import {
  battalionService,
  type Battalion,
  type CreateBattalionData
} from '@/lib/services/battalionService';
import { toast } from 'sonner';
import { useEffect, useState } from 'react';
import { studentService } from '@/lib/services/studentService';
import { type Student } from '@/lib/types/student';

const schema = z.object({
  name: z.string().min(1, 'Battalion name is required'),
  location: z.string().min(1, 'Location is required'),
  status: z.enum(['active', 'inactive']),
  description: z.string().optional(),
  commander_id: z.string().nullable()
});

type FormData = z.infer<typeof schema>;

interface BattalionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  battalion?: Battalion;
  onSuccess: () => void;
}

export function BattalionForm({
  open,
  onOpenChange,
  battalion,
  onSuccess
}: BattalionFormProps) {
  const [commanders, setCommanders] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      location: '',
      status: 'active',
      description: '',
      commander_id: null
    }
  });

  useEffect(() => {
    const fetchCommanders = async () => {
      try {
        setLoading(true);
        const students = await studentService.getStudents();
        setCommanders(students);
      } catch (error) {
        console.error('Error fetching commanders:', error);
        toast.error('Failed to load commanders');
      } finally {
        setLoading(false);
      }
    };

    if (open) {
      fetchCommanders();
    }
  }, [open]);

  useEffect(() => {
    if (battalion) {
      form.reset({
        name: battalion.name,
        location: battalion.location,
        status: battalion.status,
        description: battalion.description,
        commander_id: battalion.commander_id
      });
    } else {
      form.reset({
        name: '',
        location: '',
        status: 'active',
        description: '',
        commander_id: null
      });
    }
  }, [battalion, form]);

  const onSubmit = async (data: FormData) => {
    try {
      if (battalion) {
        await battalionService.updateBattalion(battalion.id, data);
        toast.success('Battalion updated successfully');
      } else {
        const createData: CreateBattalionData = {
          name: data.name,
          location: data.location,
          status: data.status,
          commander_id: data.commander_id,
          description: data.description
        };
        await battalionService.createBattalion(createData);
        toast.success('Battalion created successfully');
      }
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving battalion:', error);
      toast.error('Failed to save battalion');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>
            {battalion ? 'Edit Battalion' : 'Create Battalion'}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Battalion Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g. 1st Battalion" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g. Main Campus" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Enter battalion description..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="commander_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Commander (Optional)</FormLabel>
                  <Select
                    onValueChange={value => {
                      field.onChange(value === 'none' ? null : value);
                    }}
                    value={field.value || 'none'}
                    disabled={loading}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a commander" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {loading ? (
                        <SelectItem disabled value="loading">
                          Loading commanders...
                        </SelectItem>
                      ) : commanders.length === 0 ? (
                        <SelectItem disabled value="empty">
                          No commanders available
                        </SelectItem>
                      ) : (
                        commanders.map(commander => (
                          <SelectItem key={commander.id} value={commander.id}>
                            {commander.full_name} ({commander.student_no})
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
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
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
