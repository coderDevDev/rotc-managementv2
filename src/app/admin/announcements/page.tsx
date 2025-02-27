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
  Trash2,
  MoreHorizontal,
  Bell,
  AlertTriangle,
  Info
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
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';

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
  const [userRole, setUserRole] = useState<string | null>(null);

  const supabase = createClientComponentClient();

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const {
          data: { session }
        } = await supabase.auth.getSession();
        if (!session) return;

        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();

        setUserRole(profile?.role);
      } catch (error) {
        console.error('Error fetching user role:', error);
      }
    };

    fetchUserRole();
    fetchAnnouncements();
  }, []);

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
    }
    // {
    //   title: 'Total Recipients',
    //   value: loading
    //     ? '-'
    //     : calculateStats(announcements).totalRecipients.toString(),
    //   icon: Users,
    //   description: 'Estimated reach'
    // },
    // {
    //   title: 'Upcoming Events',
    //   value: loading
    //     ? '-'
    //     : calculateStats(announcements).upcomingEvents.toString(),
    //   icon: Calendar,
    //   description: 'Scheduled activities'
    // }
  ];

  const isCoordinator = userRole === 'rotc_coordinator';

  // Add priority badges
  const getPriorityBadge = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'high':
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="w-3 h-3" />
            High Priority
          </Badge>
        );
      case 'medium':
        return (
          <Badge variant="warning" className="gap-1">
            <Bell className="w-3 h-3" />
            Medium Priority
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="gap-1">
            <Info className="w-3 h-3" />
            Info
          </Badge>
        );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6 p-8">
      {/* Enhanced Header Section */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-8 rounded-lg mb-6">
        <motion.div
          initial={{ y: -20 }}
          animate={{ y: 0 }}
          className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
              Announcements
            </h1>
            <p className="text-muted-foreground mt-2">
              {isCoordinator ? 'Manage' : 'View'} ROTC announcements and updates
            </p>
          </div>
          {isCoordinator && (
            <motion.div whileHover={{ scale: 1.02 }}>
              <Button
                onClick={() => setFormOpen(true)}
                className="shadow-lg hover:shadow-xl transition-all bg-gradient-to-r from-primary to-primary/90">
                <Plus className="w-4 h-4 mr-2" />
                New Announcement
              </Button>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Enhanced Stats Cards */}
      {isCoordinator && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}>
              <Card className="hover:shadow-md transition-all duration-200 border-l-4 border-l-primary overflow-hidden">
                <div className="absolute right-0 top-0 w-32 h-32 -mr-8 -mt-8 bg-primary/5 rounded-full" />
                <CardHeader className="pb-2 relative">
                  <CardTitle className="text-sm font-medium flex items-center">
                    <div className="p-2 rounded-full bg-primary/10 mr-3">
                      <stat.icon className="w-4 h-4 text-primary" />
                    </div>
                    {stat.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="relative">
                  {loading ? (
                    <div className="animate-pulse space-y-2">
                      <div className="h-8 w-16 bg-gray-200 rounded" />
                      <div className="h-4 w-24 bg-gray-200 rounded" />
                    </div>
                  ) : (
                    <>
                      <div className="text-3xl font-bold text-primary">
                        {stat.value}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {stat.description}
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Enhanced Search Bar */}
      <Card className="overflow-hidden border-none shadow-lg">
        <CardContent className="p-0">
          <div className="relative bg-gradient-to-r from-primary/5 to-transparent p-6">
            <div className="max-w-xl relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search announcements..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10 border-none bg-white/80 backdrop-blur-sm shadow-inner rounded-full"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Announcements List */}
      <div className="grid gap-4">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Card key={i} className="overflow-hidden">
                <CardContent className="p-6">
                  <div className="animate-pulse space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="h-5 w-48 bg-gray-200 rounded" />
                      <div className="h-5 w-24 bg-gray-200 rounded" />
                    </div>
                    <div className="h-4 w-full bg-gray-200 rounded" />
                    <div className="h-4 w-2/3 bg-gray-200 rounded" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredAnnouncements.length === 0 ? (
          <Card className="overflow-hidden border-none shadow-lg">
            <CardContent className="p-12 text-center">
              <div className="flex flex-col items-center gap-4">
                <Megaphone className="w-12 h-12 text-muted-foreground/50" />
                <div className="space-y-2">
                  <p className="text-xl font-semibold text-muted-foreground">
                    No announcements found
                  </p>
                  <p className="text-sm text-muted-foreground/60">
                    {searchTerm
                      ? 'Try adjusting your search'
                      : 'Announcements will appear here'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredAnnouncements.map((announcement, index) => (
            <motion.div
              key={announcement.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}>
              <Card className="overflow-hidden hover:shadow-md transition-all duration-200">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="text-lg font-semibold">
                          {announcement.title}
                        </h3>
                        <div className="flex gap-2">
                          {getPriorityBadge(announcement.priority)}
                          <Badge variant="outline" className="bg-primary/5">
                            {new Date(
                              announcement.created_at
                            ).toLocaleDateString()}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-muted-foreground leading-relaxed">
                        {announcement.content}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="w-4 h-4" />
                        <span>
                          Target: {announcement.audience || 'All Cadets'}
                        </span>
                      </div>
                    </div>
                    {isCoordinator && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 hover:bg-primary/5 rounded-full">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedAnnouncement(announcement);
                              setFormOpen(true);
                            }}
                            className="hover:bg-primary/5">
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedAnnouncement(announcement);
                              setDeleteId(announcement.id);
                            }}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </div>

      {/* Form and Delete Dialogs remain the same */}
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
    </motion.div>
  );
}
