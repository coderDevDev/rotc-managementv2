'use client';

import { useState, useRef, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { attendanceService } from '@/lib/services/attendanceService';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, Clock, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';

// Add this token initialization
if (!process.env.NEXT_PUBLIC_MAPBOX_TOKEN) {
  throw new Error('Mapbox token is required');
}

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

// Default coordinates for Sipocot
const DEFAULT_CENTER: [number, number] = [123.4835, 13.6151];
const DEFAULT_ZOOM = 15;

interface SetAttendanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export default function SetAttendanceDialog({
  open,
  onOpenChange,
  onSuccess
}: SetAttendanceDialogProps) {
  const [location, setLocation] = useState({ lat: 13.6151, lng: 123.4835 });
  const [radius, setRadius] = useState(50);
  const [timeLimit, setTimeLimit] = useState(30);
  const [loading, setLoading] = useState(false);
  const [mapInitialized, setMapInitialized] = useState(false);
  const [date, setDate] = useState<Date>(new Date());
  const [startTime, setStartTime] = useState('18:30'); // Default to 6:30 PM

  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);

  // Add a state to track if dialog is ready
  const [dialogReady, setDialogReady] = useState(false);

  // Initialize map when dialog is fully mounted
  useEffect(() => {
    if (!open) {
      setDialogReady(false);
      return;
    }

    // Wait for dialog to be mounted
    const timer = setTimeout(() => {
      setDialogReady(true);
    }, 100);

    return () => clearTimeout(timer);
  }, [open]);

  // Initialize map when dialog is ready
  useEffect(() => {
    if (!dialogReady || !mapContainer.current || mapInitialized) return;

    try {
      const newMap = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM
      });

      map.current = newMap;

      newMap.on('load', () => {
        // Add navigation controls
        newMap.addControl(new mapboxgl.NavigationControl());

        // Add draggable marker
        marker.current = new mapboxgl.Marker({
          draggable: true,
          color: '#4CAF50'
        })
          .setLngLat(DEFAULT_CENTER)
          .addTo(newMap);

        // Update location when marker is dragged
        marker.current.on('dragend', () => {
          const lngLat = marker.current!.getLngLat();
          setLocation({ lat: lngLat.lat, lng: lngLat.lng });
        });

        // Update marker position when map is clicked
        newMap.on('click', e => {
          marker.current!.setLngLat(e.lngLat);
          setLocation({ lat: e.lngLat.lat, lng: e.lngLat.lng });
        });

        setMapInitialized(true);
      });
    } catch (error) {
      console.error('Error initializing map:', error);
      toast.error('Failed to load map');
    }

    return () => {
      if (marker.current) {
        marker.current.remove();
        marker.current = null;
      }
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
      setMapInitialized(false);
    };
  }, [dialogReady]);

  // Update marker position when location changes
  useEffect(() => {
    if (marker.current && map.current) {
      marker.current.setLngLat([location.lng, location.lat]);
      map.current.flyTo({
        center: [location.lng, location.lat],
        zoom: DEFAULT_ZOOM
      });
    }
  }, [location]);

  const getEndTime = (
    startDate: Date,
    startTimeStr: string,
    timeLimitMin: number
  ) => {
    const [hours, minutes] = startTimeStr.split(':').map(Number);
    const dateWithTime = new Date(startDate);
    dateWithTime.setHours(hours);
    dateWithTime.setMinutes(minutes);
    dateWithTime.setSeconds(0);
    dateWithTime.setMilliseconds(0);

    return format(
      new Date(dateWithTime.getTime() + timeLimitMin * 60000),
      'h:mm a'
    );
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);

      // Combine date and time
      const [hours, minutes] = startTime.split(':').map(Number);
      const startDateTime = new Date(date);
      startDateTime.setHours(hours, minutes, 0);

      await attendanceService.createSession({
        location,
        radius,
        timeLimit,
        startTime: startDateTime.toISOString(),
        // Add end time based on timeLimit
        endTime: new Date(
          startDateTime.getTime() + timeLimit * 60000
        ).toISOString()
      });

      toast.success('Attendance session created successfully');
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating attendance session:', error);
      toast.error('Failed to create attendance session');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] h-[700px] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Set Attendance Location & Time</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Location (Click map or drag marker to set location)</Label>
            <div className="relative h-[300px] w-full rounded-lg overflow-hidden border">
              {!dialogReady ? (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : (
                <div
                  ref={mapContainer}
                  className="absolute inset-0 w-full h-full"
                  style={{ background: '#f0f0f0' }}
                />
              )}
            </div>
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div className="text-sm">
                <span className="font-medium">Latitude: </span>
                {location.lat.toFixed(6)}
              </div>
              <div className="text-sm">
                <span className="font-medium">Longitude: </span>
                {location.lng.toFixed(6)}
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Allowed Radius (meters)</Label>
            <Input
              type="number"
              min="10"
              max="1000"
              value={radius}
              onChange={e => setRadius(Number(e.target.value))}
            />
            <p className="text-sm text-muted-foreground">
              Cadets must be within this distance from the location
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(date, 'PPP')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={date => date && setDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Start Time</Label>
              <Input
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Set when attendance checking starts
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Time Window (minutes)</Label>
            <Input
              type="number"
              min="1"
              max="180"
              value={timeLimit}
              onChange={e => setTimeLimit(Number(e.target.value))}
            />
            <p className="text-sm text-muted-foreground">
              Attendance will be open for {timeLimit} minutes until{' '}
              <span className="font-medium">
                {getEndTime(date, startTime, timeLimit)}
              </span>
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <MapPin className="w-4 h-4 mr-2" />
                Set Location
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
