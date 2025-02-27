'use client';

import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { AttendanceSession } from '@/lib/services/attendanceService';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

if (!process.env.NEXT_PUBLIC_MAPBOX_TOKEN) {
  throw new Error('Mapbox token is required');
}

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

interface AttendanceMapProps {
  session: AttendanceSession | null;
}

// Fix the GeoJSON type
interface GeoJSONCircle {
  type: 'Feature';
  geometry: {
    type: 'Polygon';
    coordinates: number[][][];
  };
  properties: Record<string, unknown>;
}

// Default coordinates for Sipocot, Camarines Sur
const DEFAULT_CENTER: [number, number] = [123.4835, 13.6151];
const DEFAULT_ZOOM = 15;

export default function AttendanceMap({ session }: AttendanceMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    try {
      const center = session?.location
        ? [session.location.lng, session.location.lat]
        : DEFAULT_CENTER;

      const newMap = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: center as [number, number],
        zoom: DEFAULT_ZOOM
      });

      map.current = newMap;

      newMap.addControl(new mapboxgl.NavigationControl());

      // Wait for map to load before adding layers
      newMap.on('load', () => {
        if (!session?.location) {
          // If no session, add a message or marker at default location
          marker.current = new mapboxgl.Marker({ color: '#666666' })
            .setLngLat(DEFAULT_CENTER)
            .addTo(newMap);
          return;
        }

        // Add radius circle and marker for active session
        try {
          newMap.addSource('radius', {
            type: 'geojson',
            data: createGeoJSONCircle(
              [session.location.lng, session.location.lat],
              session.radius
            )
          });

          newMap.addLayer({
            id: 'radius',
            type: 'fill',
            source: 'radius',
            paint: {
              'fill-color': '#4CAF50',
              'fill-opacity': 0.2
            }
          });

          newMap.addLayer({
            id: 'radius-border',
            type: 'line',
            source: 'radius',
            paint: {
              'line-color': '#4CAF50',
              'line-width': 2
            }
          });

          marker.current = new mapboxgl.Marker()
            .setLngLat([session.location.lng, session.location.lat])
            .addTo(newMap);
        } catch (error) {
          console.error('Error adding session layers:', error);
        }
      });

      // Cleanup function
      return () => {
        if (marker.current) {
          marker.current.remove();
          marker.current = null;
        }
        if (map.current) {
          map.current.remove();
          map.current = null;
        }
      };
    } catch (error) {
      console.error('Error initializing map:', error);
    }
  }, [session]);

  // In the createGeoJSONCircle function, specify the return type
  function createGeoJSONCircle(
    center: [number, number],
    radiusInMeters: number
  ): GeoJSONCircle {
    const points = 64;
    const km = radiusInMeters / 1000;
    const ret = [];
    const distanceX = km / (111.32 * Math.cos((center[1] * Math.PI) / 180));
    const distanceY = km / 110.574;

    let theta, x, y;
    for (let i = 0; i < points; i++) {
      theta = (i / points) * (2 * Math.PI);
      x = distanceX * Math.cos(theta);
      y = distanceY * Math.sin(theta);
      ret.push([center[0] + x, center[1] + y]);
    }
    ret.push(ret[0]);

    return {
      type: 'Feature' as const,
      geometry: {
        type: 'Polygon' as const,
        coordinates: [ret]
      },
      properties: {}
    };
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Attendance Location</CardTitle>
        {!session && (
          <Alert variant="default" className="mt-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No active attendance session. The map shows the default location.
            </AlertDescription>
          </Alert>
        )}
      </CardHeader>
      <CardContent>
        <div ref={mapContainer} className="h-[400px] rounded-lg" />
      </CardContent>
    </Card>
  );
}
