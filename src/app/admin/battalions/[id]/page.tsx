'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  battalionService,
  type Battalion,
  type BattalionMember
} from '@/lib/services/battalionService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Users,
  Building2,
  MapPin,
  Edit,
  UserPlus,
  ChevronLeft,
  Upload
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { MemberForm } from '../components/MemberForm';
import { BattalionForm } from '../components/BattalionForm';
import { DeleteMemberDialog } from '../components/DeleteMemberDialog';
import { BulkImportDialog } from '../components/BulkImportDialog';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function BattalionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [profile, setProfile] = useState(null);
  const [battalion, setBattalion] = useState<Battalion | null>(null);
  const [members, setMembers] = useState<BattalionMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(params.id === 'new');
  const [memberFormOpen, setMemberFormOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<BattalionMember>();
  const [deleteUserId, setDeleteUserId] = useState<string>();
  const [bulkImportOpen, setBulkImportOpen] = useState(false);

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

  const fetchBattalionData = async () => {
    if (params.id === 'new') {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [battalionData, membersData] = await Promise.all([
        battalionService.getBattalion(params.id as string),
        battalionService.getBattalionMembers(params.id as string)
      ]);

      // If user is ROTC officer and not assigned to this battalion, redirect
      if (
        profile?.role === 'rotc_officer' &&
        battalionData.commander_id !== profile.id
      ) {
        toast.error('You do not have access to this battalion');
        router.push('/admin/battalions');
        return;
      }

      setBattalion(battalionData);
      setMembers(membersData);
    } catch (error) {
      console.error('Error fetching battalion data:', error);
      toast.error('Failed to load battalion data');
      router.push('/admin/battalions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBattalionData();
  }, [params.id]);

  const handleMemberFormClose = () => {
    setMemberFormOpen(false);
    setSelectedMember(undefined);
  };

  const handleDeleteDialogClose = () => {
    setDeleteUserId(undefined);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (params.id === 'new') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/battalions">
            <Button variant="ghost" size="sm">
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
          </Link>
          <h1 className="text-2xl font-semibold">Create New Battalion</h1>
        </div>

        <BattalionForm
          open={true}
          onOpenChange={open => {
            if (!open) router.push('/admin/battalions');
          }}
          onSuccess={() => {
            toast.success('Battalion created successfully');
            router.push('/admin/battalions');
          }}
        />
      </div>
    );
  }

  if (!battalion) {
    return <div>Battalion not found</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link href="/admin/battalions">
            <Button variant="ghost" size="sm">
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold">{battalion.name}</h1>
            <p className="text-sm text-gray-500 mt-1">
              <MapPin className="w-4 h-4 inline mr-1" />
              {battalion.location}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {/* <Button variant="outline" onClick={() => setBulkImportOpen(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Bulk Import
          </Button> */}
          <Button variant="outline" onClick={() => setMemberFormOpen(true)}>
            <UserPlus className="w-4 h-4 mr-2" />
            Add Member
          </Button>

          {profile?.role === 'rotc_coordinator' && (
            <Button onClick={() => setFormOpen(true)}>
              <Edit className="w-4 h-4 mr-2" />
              Edit Battalion
            </Button>
          )}
        </div>
      </div>

      {/* Battalion Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">
                Status
              </label>
              <div
                className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                  battalion.status === 'active'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-700'
                }`}>
                {battalion?.status?.toUpperCase()}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">
                ROTC Officer
              </label>
              <p className="text-sm">
                {battalion.commander?.full_name || 'Not assigned'}
              </p>
            </div>
            {battalion.description && (
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Description
                </label>
                <p className="text-sm">{battalion.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Personnel Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {['commander', 'platoon_leader', 'squad_leader', 'cadet'].map(
                role => (
                  <div key={role} className="flex justify-between items-center">
                    <span className="text-sm capitalize">
                      {role.replace('_', ' ')}s
                    </span>
                    <span className="text-sm font-medium">
                      {members.filter(m => m.role === role).length}
                    </span>
                  </div>
                )
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Members List */}
      <Card>
        <CardHeader>
          <CardTitle>Battalion Personnel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {members.map(member => (
              <div
                key={member.id}
                className="py-4 flex items-center justify-between">
                <div>
                  <div className="font-medium">{member.user.full_name}</div>
                  <div className="text-sm text-gray-500">
                    {member.role.replace('_', ' ').toUpperCase()} •{' '}
                    {member.rank}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedMember(member);
                      setMemberFormOpen(true);
                    }}>
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600"
                    onClick={() => setDeleteUserId(member.user_id)}>
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Battalion Form */}
      <BattalionForm
        open={formOpen}
        onOpenChange={setFormOpen}
        battalion={battalion}
        onSuccess={fetchBattalionData}
      />

      {/* Member Form */}
      <MemberForm
        open={memberFormOpen}
        onOpenChange={open => {
          if (!open) handleMemberFormClose();
        }}
        battalionId={battalion.id}
        member={selectedMember}
        onSuccess={fetchBattalionData}
      />

      <DeleteMemberDialog
        open={!!deleteUserId}
        onOpenChange={handleDeleteDialogClose}
        battalionId={battalion.id}
        userId={deleteUserId || ''}
        memberName={
          members.find(m => m.user_id === deleteUserId)?.user.full_name || ''
        }
        onSuccess={fetchBattalionData}
      />

      <BulkImportDialog
        open={bulkImportOpen}
        onOpenChange={setBulkImportOpen}
        battalionId={battalion.id}
        onSuccess={fetchBattalionData}
      />
    </div>
  );
}
