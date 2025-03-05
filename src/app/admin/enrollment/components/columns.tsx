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
import { Eye, Edit, MoreHorizontal, Check, X } from 'lucide-react';
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
  // {
  //   accessorKey: 'status',
  //   header: 'Status',
  //   cell: ({ row }) => {
  //     const status = row.getValue('status') as
  //       | 'pending'
  //       | 'approved'
  //       | 'rejected';

  //     return (
  //       <Badge
  //         className={cn(
  //           'capitalize',
  //           status === 'approved' &&
  //             'bg-green-100 text-green-800 hover:bg-green-100',
  //           status === 'pending' &&
  //             'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
  //           status === 'rejected' && 'bg-red-100 text-red-800 hover:bg-red-100'
  //         )}>
  //         {status === 'approved' && <Check className="w-3 h-3 mr-1" />}
  //         {status === 'pending' && (
  //           <div className="w-2 h-2 rounded-full bg-yellow-500 mr-2" />
  //         )}
  //         {status === 'rejected' && <X className="w-3 h-3 mr-1" />}
  //         {status}
  //       </Badge>
  //     );
  //   }
  // },
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
            {/* {enrollment.status === 'pending' && (
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
            )} */}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }
  }
];
