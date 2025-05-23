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
  announcementService,
  type Announcement
} from '@/lib/services/announcementService';
import { toast } from 'sonner';
import { useEffect } from 'react';

const formSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
  type: z.enum(['Training', 'Event', 'Notice']),
  status: z.enum(['draft', 'published']),
  publish_date: z.string()
});

type FormData = z.infer<typeof formSchema>;

interface AnnouncementFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  announcement?: Announcement;
  onSuccess: () => void;
}

export function AnnouncementForm({
  open,
  onOpenChange,
  announcement,
  onSuccess
}: AnnouncementFormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: announcement?.title || '',
      content: announcement?.content || '',
      type: announcement?.type || 'Notice',
      status: announcement?.status || 'draft',
      publish_date:
        announcement?.publish_date || new Date().toISOString().split('T')[0]
    }
  });

  // Reset form when dialog opens/closes or announcement changes
  useEffect(() => {
    if (announcement) {
      // Format the date to match the input format
      const formattedDate = new Date(announcement.publish_date)
        .toISOString()
        .slice(0, 16);

      form.reset({
        title: announcement.title,
        content: announcement.content,
        type: announcement.type,
        status: announcement.status,
        publish_date: formattedDate
      });
    } else {
      form.reset({
        title: '',
        content: '',
        type: 'Notice',
        status: 'draft',
        publish_date: new Date().toISOString().split('T')[0]
      });
    }
  }, [announcement, form]);

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    try {
      if (announcement) {
        await announcementService.updateAnnouncement(announcement.id, {
          ...data,
          priority: 'High',
          audience: 'everyone'
        });
        toast.success('Announcement updated successfully');
      } else {
        await announcementService.createAnnouncement({
          ...data,
          priority: 'High',
          audience: 'everyone'
        });
        toast.success('Announcement created successfully');
      }
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving announcement:', error);
      toast.error('Failed to save announcement');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>
            {announcement ? 'Edit Announcement' : 'Create Announcement'}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Enter a clear and concise title"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Content</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      className="min-h-[200px]"
                      placeholder={`Describe the announcement details:

What: What is happening or what needs to be done?
Where: Location or venue of the event/activity
When: Date, time, and duration
Who: Who needs to attend or who is this for?
Additional Information: Any other important details`}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Training">Training</SelectItem>
                        <SelectItem value="Event">Event</SelectItem>
                        <SelectItem value="Notice">Notice</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="publish_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Publish Date</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
                  </FormControl>
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
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
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
