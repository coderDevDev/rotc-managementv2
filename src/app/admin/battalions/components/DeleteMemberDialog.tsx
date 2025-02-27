'use client';

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
import { battalionService } from '@/lib/services/battalionService';
import { toast } from 'sonner';

interface DeleteMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  battalionId: string;
  userId: string;
  memberName: string;
  onSuccess: () => void;
}

export function DeleteMemberDialog({
  open,
  onOpenChange,
  battalionId,
  userId,
  memberName,
  onSuccess
}: DeleteMemberDialogProps) {
  const handleDelete = async () => {
    try {
      await battalionService.removeMember(battalionId, userId);
      toast.success('Member removed successfully');
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error('Failed to remove member');
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove Battalion Member</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to remove {memberName} from this battalion?
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-red-600 hover:bg-red-700">
            Remove
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
