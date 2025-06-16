import { ColumnDef } from '@tanstack/react-table';
import { Enrollment } from '../page'; // Make sure to export the Enrollment interface
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Eye,
  Edit,
  MoreHorizontal,
  Check,
  X,
  Archive,
  CheckCircle,
  XCircle,
  Clock,
  Archive as ArchiveIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';

export const columns: ColumnDef<Enrollment>[] = [
  {
    accessorKey: 'student_no',
    header: 'Student No.',
    cell: ({ row }) => (
      <div className="font-medium">{row.getValue('student_no')}</div>
    ),
    sortingFn: 'alphanumeric'
  },
  {
    accessorKey: 'first_name',
    header: 'First Name',
    cell: ({ row }) => (
      <div className="capitalize">{row.getValue('first_name')}</div>
    ),
    sortingFn: 'alphanumeric'
  },
  {
    accessorKey: 'last_name',
    header: 'Last Name',
    cell: ({ row }) => (
      <div className="capitalize">{row.getValue('last_name')}</div>
    )
  },
  {
    accessorKey: 'course',
    header: 'Course',
    cell: ({ row }) => (
      <div className="font-medium">{row.getValue('course')}</div>
    )
  },
  {
    accessorKey: 'ms',
    header: 'MS Level',
    cell: ({ row }) => <div className="font-medium">{row.getValue('ms')}</div>
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.getValue('status') as string;

      return (
        <Badge
          className={cn(
            'capitalize',
            status === 'approved' &&
              'bg-green-100 text-green-800 hover:bg-green-100',
            status === 'pending' &&
              'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
            status === 'rejected' &&
              'bg-green-100 text-green-800 hover:bg-green-100',
            status === 'archived' &&
              'bg-gray-100 text-gray-800 hover:bg-gray-100'
          )}>
          {/* {status === 'approved' && <CheckCircle className="w-3 h-3 mr-1" />}
          {status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
          {status === 'rejected' && <XCircle className="w-3 h-3 mr-1" />} */}
          {status === 'archived' && <ArchiveIcon className="w-3 h-3 mr-1" />}

          <span className="capitalize">
            {status === 'archived' ? 'Archived' : 'Enrolled'}
          </span>
        </Badge>
      );
    }
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const enrollment = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => enrollment.onView?.(enrollment)}
              className="cursor-pointer">
              <Eye className="mr-2 h-4 w-4" />
              View Details
            </DropdownMenuItem>
            {/* <DropdownMenuItem
              onClick={() => enrollment.onEdit?.(enrollment)}
              className="cursor-pointer">
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem> */}
            {enrollment.status === 'pending' && (
              <>
                <DropdownMenuItem
                  onClick={() => enrollment.onApprove?.(enrollment)}
                  className="cursor-pointer text-green-600">
                  <Check className="mr-2 h-4 w-4" />
                  Approve
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => enrollment.onReject?.(enrollment)}
                  className="cursor-pointer text-red-600">
                  <X className="mr-2 h-4 w-4" />
                  Reject
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuItem
              onClick={() => enrollment.onArchive?.(enrollment)}
              className="cursor-pointer text-gray-600">
              <Archive className="mr-2 h-4 w-4" />
              Archive
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }
  }
];
