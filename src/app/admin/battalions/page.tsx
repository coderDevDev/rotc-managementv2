'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Search,
  Plus,
  Users,
  Building2,
  MapPin,
  ChevronRight
} from 'lucide-react';
import {
  battalionService,
  type Battalion
} from '@/lib/services/battalionService';
import { toast } from 'sonner';
import Link from 'next/link';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function BattalionsPage() {
  const supabase = createClientComponentClient();
  const [profile, setProfile] = useState(null);
  const [battalions, setBattalions] = useState<Battalion[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const getProfile = async () => {
      try {
        const {
          data: { session }
        } = await supabase.auth.getSession();
        if (!session) return;

        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (error) throw error;
        setProfile(profileData);
      } catch (error) {
        console.error('Error:', error);
      }
    };

    getProfile();
  }, [supabase]);

  useEffect(() => {
    const fetchBattalions = async () => {
      try {
        if (profile?.role === 'rotc_officer') {
          // If ROTC officer, only fetch their assigned battalion
          const data = await battalionService.getOfficerBattalion(profile.id);
          setBattalions(Array.isArray(data) ? data : [data].filter(Boolean));
        } else {
          // For coordinator and other roles, fetch all battalions
          const data = await battalionService.getBattalions();
          setBattalions(data);
        }
      } catch (error) {
        console.error('Error fetching battalions:', error);
        toast.error('Failed to load battalions');
      } finally {
        setLoading(false);
      }
    };

    if (profile) {
      fetchBattalions();
    }
  }, [profile]);

  const filteredBattalions = battalions.filter(battalion =>
    battalion.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">Battalions</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage ROTC battalions and their personnel
          </p>
        </div>

        {profile?.role === 'rotc_coordinator' && (
          <Link href="/admin/battalions/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Battalion
            </Button>
          </Link>
        )}
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              <Building2 className="w-4 h-4 inline mr-2" />
              Total Battalions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{battalions.length}</div>
          </CardContent>
        </Card>
        {/* Add more stat cards as needed */}
      </div>

      {/* Search */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search battalions..."
            className="pl-8"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Battalions List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredBattalions.map(battalion => (
          <Link
            key={battalion.id}
            href={`/admin/battalions/${battalion.id}`}
            className="block">
            <Card className="hover:bg-gray-50 transition-colors">
              <CardHeader>
                <CardTitle className="flex justify-between items-start">
                  <div>
                    <span className="text-lg">{battalion.name}</span>
                    <div className="flex items-center text-sm text-gray-500 mt-1">
                      <MapPin className="w-4 h-4 mr-1" />
                      {battalion.location}
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center text-sm text-gray-600">
                  <Users className="w-4 h-4 mr-1" />
                  {/* Add member count here */} members
                </div>
                <div
                  className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium mt-2 ${
                    battalion.status === 'active'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                  {battalion?.status?.toUpperCase()}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
