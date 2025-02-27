'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, AlertCircle, Plus } from 'lucide-react';
import type { Announcement } from '@/lib/services/announcementService';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface AnnouncementListProps {
  announcements: Announcement[];
  onEdit: (announcement: Announcement) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
  loading?: boolean;
}

export function AnnouncementList({
  announcements,
  onEdit,
  onDelete,
  onNew,
  loading = false
}: AnnouncementListProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-gray-200 rounded w-1/3" />
            </CardHeader>
            <CardContent>
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-4 bg-gray-200 rounded w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (announcements.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>No announcements found</AlertTitle>
        <AlertDescription className="flex items-center justify-between">
          <span>Get started by creating your first announcement.</span>
          <Button onClick={onNew} size="sm" className="mt-2">
            <Plus className="h-4 w-4 mr-2" />
            Create Announcement
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {announcements.map(announcement => (
        <Card key={announcement.id} className="relative overflow-hidden">
          <div
            className={`absolute left-0 top-0 w-1 h-full ${
              announcement.priority === 'High'
                ? 'bg-red-500'
                : announcement.priority === 'Medium'
                ? 'bg-yellow-500'
                : 'bg-blue-500'
            }`}
          />
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>{announcement.title}</CardTitle>
                <p className="text-sm text-gray-500 mt-1">
                  Posted on{' '}
                  {new Date(announcement.created_at).toLocaleDateString()} •{' '}
                  {announcement.type} • {announcement.audience}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(announcement)}>
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600"
                  onClick={() => onDelete(announcement.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">{announcement.content}</p>
            <div className="flex gap-2 mt-4">
              <span
                className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                  announcement.status === 'published'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-700'
                }`}>
                {announcement.status.toUpperCase()}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
