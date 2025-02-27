import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

const supabase = createClientComponentClient();

export interface Announcement {
  id: string;
  title: string;
  content: string;
  type: 'Training' | 'Event' | 'Notice';
  priority: 'High' | 'Medium' | 'Low';
  audience: string;
  status: 'draft' | 'published';
  publish_date: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export const announcementService = {
  async createAnnouncement(
    data: Omit<Announcement, 'id' | 'created_by' | 'created_at' | 'updated_at'>
  ) {
    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!user) throw new Error('User not found');

    const { data: announcement, error } = await supabase
      .from('announcements')
      .insert([
        {
          ...data,
          created_by: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (error) throw error;
    return announcement;
  },

  async updateAnnouncement(id: string, data: Partial<Announcement>) {
    const { data: announcement, error } = await supabase
      .from('announcements')
      .update({
        ...data,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return announcement;
  },

  async deleteAnnouncement(id: string) {
    const { error } = await supabase
      .from('announcements')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async getAnnouncements() {
    const { data: announcements, error } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return announcements;
  },

  async getAnnouncement(id: string) {
    const { data: announcement, error } = await supabase
      .from('announcements')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return announcement;
  }
};
