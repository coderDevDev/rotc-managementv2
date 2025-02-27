'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Search,
  Plus,
  Calendar,
  Megaphone,
  Users,
  Edit,
  Trash2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { AnnouncementForm } from './components/AnnouncementForm';
import { AnnouncementList } from './components/AnnouncementList';
import {
  announcementService,
  type Announcement
} from '@/lib/services/announcementService';
import { toast } from 'sonner';
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

// Mock data
const announcements = [
  {
    id: 1,
    title: 'Weekend Training Schedule Update',
    content:
      'Training this Saturday will start at 6:00 AM. All cadets must arrive 30 minutes early for assembly.',
    type: 'Training',
    date: '2024-03-20',
    priority: 'High',
    audience: 'All Cadets'
  }
];

function calculateStats(announcements: Announcement[]) {
  const now = new Date();

  return {
    activeAnnouncements: announcements.filter(a => a.status === 'published')
      .length,

    totalRecipients:
      announcements.filter(a => a.status === 'published').length * 100, // Multiply by estimated audience size

    upcomingEvents: announcements.filter(
      a =>
        a.type === 'Event' &&
        a.status === 'published' &&
        new Date(a.publish_date) > now
    ).length
  };
}

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] =
    useState<Announcement | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const data = await announcementService.getAnnouncements();
      setAnnouncements(data);
    } catch (error) {
      console.error('Error fetching announcements:', error);
      toast.error('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handleEdit = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await announcementService.deleteAnnouncement(deleteId);
      toast.success('Announcement deleted successfully');
      setDeleteId(null);
      fetchAnnouncements();
    } catch (error) {
      console.error('Error deleting announcement:', error);
      toast.error('Failed to delete announcement');
    }
  };

  const filteredAnnouncements = announcements.filter(
    announcement =>
      (filterType === 'all' || announcement.type === filterType) &&
      (announcement.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        announcement.content.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Replace the static stats with dynamic stats
  const stats = [
    {
      title: 'Active Announcements',
      value: loading
        ? '-'
        : calculateStats(announcements).activeAnnouncements.toString(),
      icon: Megaphone,
      description: 'Currently published'
    },
    {
      title: 'Total Recipients',
      value: loading
        ? '-'
        : calculateStats(announcements).totalRecipients.toString(),
      icon: Users,
      description: 'Estimated reach'
    },
    {
      title: 'Upcoming Events',
      value: loading
        ? '-'
        : calculateStats(announcements).upcomingEvents.toString(),
      icon: Calendar,
      description: 'Scheduled activities'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">Announcements</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage and publish ROTC announcements
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Announcement
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map(stat => (
          <Card key={stat.title}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500 flex items-center">
                <stat.icon className="w-4 h-4 mr-2 text-primary" />
                {stat.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="animate-pulse">
                  <div className="h-8 w-16 bg-gray-200 rounded" />
                  <div className="h-4 w-24 bg-gray-200 rounded mt-2" />
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-sm text-gray-500 mt-1">
                    {stat.description}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search announcements..."
            className="pl-8"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="Training">Training</SelectItem>
            <SelectItem value="Event">Event</SelectItem>
            <SelectItem value="Notice">Notice</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Announcements List */}
      <AnnouncementList
        announcements={filteredAnnouncements}
        onEdit={handleEdit}
        onDelete={id => setDeleteId(id)}
        onNew={() => setFormOpen(true)}
        loading={loading}
      />

      {/* Form Dialog */}
      <AnnouncementForm
        open={formOpen}
        onOpenChange={open => {
          setFormOpen(open);
          if (!open) setSelectedAnnouncement(null);
        }}
        announcement={selectedAnnouncement}
        onSuccess={() => {
          fetchAnnouncements();
          setSelectedAnnouncement(null);
        }}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Announcement</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The announcement will be permanently
              deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
