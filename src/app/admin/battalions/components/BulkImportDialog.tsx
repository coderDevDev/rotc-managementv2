'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { battalionService } from '@/lib/services/battalionService';

interface BulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  battalionId: string;
  onSuccess: () => void;
}

interface ImportRow {
  student_no: string;
  role: 'commander' | 'platoon_leader' | 'squad_leader' | 'cadet';
  rank: string;
}

export function BulkImportDialog({
  open,
  onOpenChange,
  battalionId,
  onSuccess
}: BulkImportDialogProps) {
  const [loading, setLoading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setLoading(true);
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async event => {
        try {
          const data = event.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json<ImportRow>(worksheet);

          // Process each row
          for (const row of rows) {
            await battalionService.addMember({
              battalion_id: battalionId,
              user_id: row.student_no, // You'll need to map student_no to user_id
              role: row.role,
              rank: row.rank
            });
          }

          toast.success(`Successfully imported ${rows.length} members`);
          onOpenChange(false);
          onSuccess();
        } catch (error) {
          console.error('Error processing file:', error);
          toast.error('Failed to process file');
        }
      };

      reader.readAsBinaryString(file);
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Failed to upload file');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Bulk Import Members</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg border-2 border-dashed p-6 text-center">
            <Input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              disabled={loading}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer text-sm text-gray-600">
              <Upload className="mx-auto h-8 w-8 text-gray-400" />
              <p className="mt-2">Click to upload Excel file</p>
              <p className="text-xs text-gray-500">
                .xlsx or .xls files supported
              </p>
            </label>
          </div>

          <div className="text-xs text-gray-500">
            <p className="font-medium">File format:</p>
            <p>- Column A: Student Number</p>
            <p>
              - Column B: Role (commander/platoon_leader/squad_leader/cadet)
            </p>
            <p>- Column C: Rank</p>
          </div>

          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
