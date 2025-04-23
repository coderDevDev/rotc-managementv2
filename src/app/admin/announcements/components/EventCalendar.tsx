'use client';

import { useState, useCallback, useMemo } from 'react';
import { Calendar, Views, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Plus
} from 'lucide-react';
import { Announcement } from '@/lib/services/announcementService';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

// Set up the calendar localizer
const localizer = momentLocalizer(moment);

interface EventCalendarProps {
  announcements: Announcement[];
  onNewEvent: () => void;
}

export function EventCalendar({
  announcements,
  onNewEvent
}: EventCalendarProps) {
  const [view, setView] = useState('month');
  const [date, setDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<Announcement | null>(null);

  console.log({ announcements });
  // Convert announcements to calendar events
  const events = useMemo(() => {
    return announcements
      .filter(
        a =>
          // Include both Event and Training types that are published

          a.status === 'published'
      )
      .map(announcement => {
        // Parse the publish_date (assuming it's in ISO format)
        const start = new Date(announcement.publish_date);
        // End time is start + 1 hour by default
        const end = new Date(start);
        end.setHours(end.getHours() + 1);

        return {
          id: announcement.id,
          title: announcement.title,
          start,
          end,
          allDay: false,
          resource: announcement
        };
      });
  }, [announcements]);

  // Handle event selection
  const handleSelectEvent = useCallback((event: any) => {
    setSelectedEvent(event.resource);
  }, []);

  // Navigate to today
  const handleToday = useCallback(() => {
    setDate(new Date());
  }, []);

  // Navigate to previous period
  const handleNavigate = useCallback(
    (action: 'PREV' | 'NEXT') => {
      const newDate = new Date(date);
      if (action === 'PREV') {
        newDate.setMonth(date.getMonth() - 1);
      } else {
        newDate.setMonth(date.getMonth() + 1);
      }
      setDate(newDate);
    },
    [date]
  );

  // Format event display
  const eventStyleGetter = (event: any) => {
    const type = event.resource?.type || '';
    const priority = event.resource?.priority?.toLowerCase() || 'low';

    // Base color by type
    let backgroundColor = '#3498db'; // default blue for Events

    // Different colors for different types
    if (type === 'Training') {
      backgroundColor = '#27ae60'; // green for Training
    } else if (type === 'Notice') {
      backgroundColor = '#27ae60'; // purple for Notices
    }

    // Override with priority colors if high or medium
    if (priority === 'high') {
      backgroundColor = '#27ae60'; // red for High priority
    } else if (priority === 'medium') {
      backgroundColor = '#f39c12'; // orange for Medium priority
    }

    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        opacity: 0.9,
        color: 'white',
        border: '0px',
        display: 'block',
        fontWeight: 500
      }
    };
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleNavigate('PREV')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleToday}>
            Today
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleNavigate('NEXT')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <h3 className="text-lg font-medium ml-2">
            {moment(date).format('MMMM YYYY')}
          </h3>
        </div>
        {/* <Button onClick={onNewEvent} className="gap-1">
          <Plus className="h-4 w-4" />
          New Event
        </Button> */}
      </div>

      <Card>
        <CardContent className="p-0 lg:p-4">
          <div style={{ height: 600 }}>
            <Calendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              view={view as any}
              onView={newView => setView(newView)}
              date={date}
              onNavigate={setDate}
              style={{ height: '100%' }}
              eventPropGetter={eventStyleGetter}
              onSelectEvent={handleSelectEvent}
              popup
              components={{
                toolbar: () => null // We're using our custom toolbar
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Event Details Dialog */}
      <Dialog
        open={!!selectedEvent}
        onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>{selectedEvent?.title}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex flex-wrap gap-2 mb-3">
              <Badge
                variant={
                  selectedEvent?.type === 'Training' ? 'default' : 'secondary'
                }>
                {selectedEvent?.type}
              </Badge>
              <Badge
                variant={
                  selectedEvent?.priority === 'High'
                    ? 'destructive'
                    : selectedEvent?.priority === 'Medium'
                    ? 'warning'
                    : 'secondary'
                }>
                {selectedEvent?.priority} Priority
              </Badge>
              <Badge variant="outline">
                {selectedEvent?.audience || 'All Cadets'}
              </Badge>
              <Badge
                variant={
                  selectedEvent?.status === 'published' ? 'success' : 'outline'
                }>
                {selectedEvent?.status === 'published' ? 'Published' : 'Draft'}
              </Badge>
            </div>

            <div className="text-sm">
              <p className="font-medium flex items-center gap-2 mb-2">
                <CalendarIcon className="h-4 w-4" />
                {moment(selectedEvent?.publish_date).format(
                  'MMMM DD, YYYY [at] h:mm A'
                )}
              </p>
              <p className="whitespace-pre-line text-muted-foreground">
                {selectedEvent?.content}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
