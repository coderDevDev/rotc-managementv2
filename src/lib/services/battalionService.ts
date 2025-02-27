import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

const supabase = createClientComponentClient();

export interface Battalion {
  id: string;
  name: string;
  location: string;
  commander_id: string | null;
  status: 'active' | 'inactive';
  description?: string;
  created_at: string;
  updated_at: string;
  commander?: {
    id: string;
    full_name: string;
    email: string;
    student_no: string;
  };
}

export interface BattalionMember {
  id: string;
  battalion_id: string;
  user_id: string;
  role: 'commander' | 'platoon_leader' | 'squad_leader' | 'cadet';
  rank: string;
  assigned_at: string;
  user: {
    id: string;
    full_name: string;
    email: string;
    student_no: string;
    contact_no: string;
  };
}

export interface MemberFormData {
  user_id: string;
  role: BattalionMember['role'];
  rank: string;
}

export type UpdateMemberData = Partial<MemberFormData>;

export type CreateBattalionData = {
  name: string;
  location: string;
  commander_id: string | null;
  status: 'active' | 'inactive';
  description?: string;
};

export const battalionService = {
  async getBattalions() {
    const { data: battalions, error } = await supabase
      .from('battalions')
      .select(
        `
        *,
        commander:commander_id (
          id,
          full_name,
          email,
          student_no
        )
      `
      )
      .order('created_at', { ascending: false });

    if (error) throw error;
    return battalions as Battalion[];
  },

  async getBattalion(id: string) {
    const { data: battalion, error } = await supabase
      .from('battalions')
      .select(
        `
        *,
        commander:commander_id (
          id,
          full_name,
          email,
          student_no
        )
      `
      )
      .eq('id', id)
      .single();

    if (error) throw error;
    return battalion as Battalion;
  },

  async getBattalionMembers(battalionId: string) {
    const { data: members, error } = await supabase
      .from('battalion_members')
      .select(
        `
        *,
        user:user_id (
          id,
          full_name,
          email,
          student_no,
          contact_no
        )
      `
      )
      .eq('battalion_id', battalionId)
      .order('role', { ascending: true });

    if (error) throw error;
    return members as BattalionMember[];
  },

  async createBattalion(
    data: Omit<Battalion, 'id' | 'created_at' | 'updated_at'>
  ) {
    const { data: battalion, error } = await supabase
      .from('battalions')
      .insert([
        {
          ...data,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (error) throw error;
    return battalion;
  },

  async updateBattalion(id: string, data: Partial<Battalion>) {
    const { data: battalion, error } = await supabase
      .from('battalions')
      .update({
        ...data,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return battalion;
  },

  async deleteBattalion(id: string) {
    const { error } = await supabase.from('battalions').delete().eq('id', id);
    if (error) throw error;
  },

  async checkMemberExists(userId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('battalion_members')
      .select('id')
      .eq('user_id', userId);

    if (error) throw error;

    // Check if there are any rows returned
    return (data?.length || 0) > 0;
  },

  async addMember(data: {
    battalion_id: string;
    user_id: string;
    role: BattalionMember['role'];
    rank: string;
  }) {
    // Check if member already exists in any battalion
    const exists = await this.checkMemberExists(data.user_id);
    if (exists) {
      throw new Error('User is already assigned to a battalion');
    }

    const { data: member, error } = await supabase
      .from('battalion_members')
      .insert([
        {
          ...data,
          assigned_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (error) throw error;
    return member;
  },

  async updateMember(
    battalionId: string,
    userId: string,
    data: Partial<BattalionMember>
  ) {
    const { data: member, error } = await supabase
      .from('battalion_members')
      .update(data)
      .eq('battalion_id', battalionId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return member;
  },

  async removeMember(battalionId: string, userId: string) {
    const { error } = await supabase
      .from('battalion_members')
      .delete()
      .eq('battalion_id', battalionId)
      .eq('user_id', userId);

    if (error) throw error;
  }
};
