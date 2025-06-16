'use client';

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, MapPin, Check } from 'lucide-react';
import { attendanceService } from '@/lib/services/attendanceService';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

if (!process.env.NEXT_PUBLIC_MAPBOX_TOKEN) {
  throw new Error('Mapbox token is required');
}

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

interface LocationPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  sessionLocation: { lat: number; lng: number };
  radius: number;
  onSessionUpdate?: () => void;
}

// Add these constants at the top
const GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true, // Force high accuracy (GPS)
  timeout: 10000, // 10 seconds timeout
  maximumAge: 0 // Force fresh location reading
};

// Add this type for the line source
type LineSource = {
  type: 'Feature';
  geometry: {
    type: 'LineString';
    coordinates: [number, number][];
  };
  properties: {};
};

export function LocationPreview({
  open,
  onOpenChange,
  sessionId,
  sessionLocation,
  radius,
  onSessionUpdate
}: LocationPreviewProps) {
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  }>();
  const [distance, setDistance] = useState<number | null>(null);
  const [dialogReady, setDialogReady] = useState(false);
  const [mapInitialized, setMapInitialized] = useState(false);
  const [locationError, setLocationError] = useState<string>();
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [sessionInfo, setSessionInfo] = useState<{
    startTime: string;
    endTime: string;
  }>();
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [studentNo, setStudentNo] = useState('');
  const [studentNoError, setStudentNoError] = useState<string | undefined>();
  const [isValidatingStudentNo, setIsValidatingStudentNo] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const supabase = createClientComponentClient();

  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const sessionMarker = useRef<mapboxgl.Marker | null>(null);
  const userMarker = useRef<mapboxgl.Marker | null>(null);

  // Initialize dialog
  useEffect(() => {
    if (!open) {
      setDialogReady(false);
      return;
    }

    const timer = setTimeout(() => {
      setDialogReady(true);
    }, 100);

    return () => clearTimeout(timer);
  }, [open]);

  // Add function to fetch session info
  const fetchSessionInfo = async () => {
    try {
      const session = await attendanceService.getSession(sessionId);
      if (session) {
        setSessionInfo({
          startTime: session.start_time,
          endTime: session.end_time
        });
      }
    } catch (error) {
      console.error('Error fetching session info:', error);
    }
  };

  // Fetch session info when dialog opens
  useEffect(() => {
    if (open) {
      fetchSessionInfo();
    }
  }, [open, sessionId]);

  // Add function to update the line between markers
  const updateLine = (userLoc: { lng: number; lat: number }) => {
    if (!map.current) return;

    // Remove existing line
    if (map.current.getSource('route')) {
      map.current.removeLayer('route');
      map.current.removeSource('route');
    }

    // Add the line
    map.current.addSource('route', {
      type: 'geojson',
      data: {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [
            [sessionLocation.lng, sessionLocation.lat],
            [userLoc.lng, userLoc.lat]
          ]
        },
        properties: {}
      }
    });

    map.current.addLayer({
      id: 'route',
      type: 'line',
      source: 'route',
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-color': distance && distance <= radius ? '#4CAF50' : '#f44336',
        'line-width': 2,
        'line-dasharray': [2, 2]
      }
    });
  };

  // Update getAccurateLocation function
  const getAccurateLocation = () => {
    setIsGettingLocation(true);
    setLocationError(undefined);

    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      position => {
        const userLoc = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setUserLocation(userLoc);

        if (map.current) {
          if (userMarker.current) {
            userMarker.current.setLngLat([userLoc.lng, userLoc.lat]);
          } else {
            userMarker.current = new mapboxgl.Marker({
              color: '#2196F3',
              draggable: false
            })
              .setLngLat([userLoc.lng, userLoc.lat])
              .setPopup(
                new mapboxgl.Popup({ offset: 25 }).setHTML(
                  '<p class="text-sm font-medium">Your Location</p>'
                )
              )
              .addTo(map.current);
          }

          // Update line
          updateLine(userLoc);

          // Fit bounds to include both markers
          const bounds = new mapboxgl.LngLatBounds()
            .extend([sessionLocation.lng, sessionLocation.lat])
            .extend([userLoc.lng, userLoc.lat]);

          map.current.fitBounds(bounds, { padding: 50 });

          // Calculate distance
          const dist = calculateDistance(
            userLoc.lat,
            userLoc.lng,
            sessionLocation.lat,
            sessionLocation.lng
          );
          setDistance(dist);
        }
        setIsGettingLocation(false);
      },
      error => {
        console.error('Geolocation error:', error);
        let errorMessage = 'Failed to get your location';

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Please allow location access to take attendance';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage =
              'Location information is unavailable. Please ensure GPS is enabled';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out. Please try again';
            break;
        }

        setLocationError(errorMessage);
        toast.error(errorMessage);
        setIsGettingLocation(false);
      },
      GEOLOCATION_OPTIONS
    );
  };

  // Initialize map
  useEffect(() => {
    if (!dialogReady || !mapContainer.current || mapInitialized) return;

    try {
      const newMap = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [sessionLocation.lng, sessionLocation.lat],
        zoom: 17 // Increased zoom level for better accuracy
      });

      map.current = newMap;

      newMap.on('load', () => {
        // Add session location marker
        sessionMarker.current = new mapboxgl.Marker({ color: '#4CAF50' })
          .setLngLat([sessionLocation.lng, sessionLocation.lat])
          .addTo(newMap);

        // Add radius circle
        newMap.addSource('radius', {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [sessionLocation.lng, sessionLocation.lat]
            },
            properties: {}
          }
        });

        newMap.addLayer({
          id: 'radius',
          type: 'circle',
          source: 'radius',
          paint: {
            'circle-radius': {
              stops: [
                [0, 0],
                [20, radius * 50]
              ],
              base: 2
            },
            'circle-color': '#4CAF50',
            'circle-opacity': 0.2,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#4CAF50'
          }
        });

        // Get initial location
        getAccurateLocation();

        setMapInitialized(true);
      });
    } catch (error) {
      console.error('Error initializing map:', error);
      toast.error('Failed to load map');
    }

    return () => {
      if (map.current) {
        if (map.current.getSource('route')) {
          map.current.removeLayer('route');
          map.current.removeSource('route');
        }
        map.current.remove();
      }
      if (sessionMarker.current) sessionMarker.current.remove();
      if (userMarker.current) userMarker.current.remove();
      setMapInitialized(false);
    };
  }, [dialogReady, sessionLocation, radius]);

  // Haversine formula to calculate distance
  function calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  // Add function to check existing attendance
  const checkExistingAttendance = async () => {
    try {
      const exists = await attendanceService.checkAttendanceExists(sessionId);
      setHasSubmitted(exists);
    } catch (error) {
      console.error('Error checking attendance:', error);
    }
  };

  // Check when dialog opens
  useEffect(() => {
    if (open) {
      checkExistingAttendance();
    }
  }, [open, sessionId]);

  // Add useEffect to get current user ID
  useEffect(() => {
    const getCurrentUser = async () => {
      const {
        data: { session }
      } = await supabase.auth.getSession();
      if (session?.user) {
        console.log('dex', session.user.id);
        setCurrentUserId(session.user.id);
      }
    };
    getCurrentUser();
  }, []);

  // Modify validateStudentNo function to show toast errors
  const validateStudentNo = async () => {
    if (!studentNo.trim()) {
      setStudentNoError('Student number is required');
      toast.error('Student number is required');
      return false;
    }

    if (!currentUserId) {
      setStudentNoError('User session not found');
      toast.error('Please log in to continue');
      return false;
    }

    setIsValidatingStudentNo(true);
    setStudentNoError(undefined);

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, student_no')
        .eq('student_no', studentNo.trim())
        .single();

      if (error || !profile) {
        setStudentNoError('Invalid student number');
        toast.error('Invalid student number');
        return false;
      }

      // Check if the student number belongs to the current user
      if (profile.id !== currentUserId) {
        setStudentNoError(
          'This student number does not belong to your account'
        );
        toast.error('This student number does not belong to your account');
        return false;
      }

      toast.success('Student number verified');
      return true;
    } catch (error) {
      console.error('Error validating student number:', error);
      setStudentNoError('Error validating student number');
      toast.error('Error validating student number');
      return false;
    } finally {
      setIsValidatingStudentNo(false);
    }
  };

  // Modify handleSubmit to include student number validation
  const handleSubmit = async () => {
    if (!userLocation) {
      toast.error('Please get your location first');
      return;
    }

    const isValidStudentNo = await validateStudentNo();
    if (!isValidStudentNo) {
      return;
    }

    try {
      setLoading(true);
      await attendanceService.submitAttendance(sessionId, userLocation);
      toast.success('Attendance recorded successfully');
      onOpenChange(false);
      onSessionUpdate?.();
    } catch (error) {
      console.error('Error submitting attendance:', error);
      toast.error('Failed to record attendance');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Confirm Your Location</DialogTitle>
          {sessionInfo && (
            <p className="text-sm text-muted-foreground">
              Session ends in{' '}
              {formatDistanceToNow(new Date(sessionInfo.endTime), {
                addSuffix: true
              })}
            </p>
          )}
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative h-[300px] w-full rounded-lg overflow-hidden border">
            {!dialogReady ? (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : (
              <>
                <div
                  ref={mapContainer}
                  className="absolute inset-0 w-full h-full"
                  style={{ background: '#f0f0f0' }}
                />
                <Button
                  size="sm"
                  className="absolute top-2 right-2 z-10"
                  onClick={getAccurateLocation}
                  disabled={isGettingLocation}>
                  {isGettingLocation ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Getting Location...
                    </>
                  ) : (
                    <>
                      <MapPin className="w-4 h-4 mr-2" />
                      Update Location
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="studentNo">Student Number</Label>
            <Input
              id="studentNo"
              placeholder="Enter your student number"
              value={studentNo}
              onChange={e => {
                setStudentNo(e.target.value);
                setStudentNoError(undefined);
              }}
              className={studentNoError ? 'border-red-500' : ''}
            />
            {studentNoError && (
              <p className="text-sm text-red-500">{studentNoError}</p>
            )}
          </div>
          <div className="space-y-2">
            {hasSubmitted ? (
              <div className="rounded-lg bg-yellow-50 p-4 text-sm text-yellow-600">
                ⚠️ You have already submitted attendance for this session
              </div>
            ) : locationError ? (
              <div className="text-sm text-red-500">{locationError}</div>
            ) : (
              distance !== null && (
                <>
                  <div className="text-sm space-y-1">
                    <p>
                      Distance from attendance point:{' '}
                      <span className="font-medium">
                        {Math.round(distance)} meters
                      </span>
                    </p>
                    <p className="text-muted-foreground">
                      {distance <= radius ? (
                        <span className="text-green-600">
                          ✅ You are within the allowed radius
                        </span>
                      ) : (
                        <span className="text-red-600">
                          ❌ You are outside the allowed radius ({radius}{' '}
                          meters)
                        </span>
                      )}
                    </p>
                  </div>
                  {sessionInfo && (
                    <div className="text-sm space-y-1">
                      <p>
                        Session start:{' '}
                        <span className="font-medium">
                          {format(new Date(sessionInfo.startTime), 'h:mm a')}
                        </span>
                      </p>
                      <p>
                        Session end:{' '}
                        <span className="font-medium">
                          {format(new Date(sessionInfo.endTime), 'h:mm a')}
                        </span>
                      </p>
                    </div>
                  )}
                </>
              )
            )}
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              loading ||
              !userLocation ||
              !distance ||
              distance > radius ||
              isValidatingStudentNo
            }>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Recording...
              </>
            ) : (
              'Confirm Attendance'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
