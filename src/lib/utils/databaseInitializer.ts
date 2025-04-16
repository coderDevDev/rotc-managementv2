import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

const supabase = createClientComponentClient();

export async function initializeDatabase() {
  try {
    // Check if terms table has any entries
    const { count, error } = await supabase
      .from('terms')
      .select('*', { count: 'exact', head: true });

    if (error) throw error;

    // If no terms exist, create a default one
    if (count === 0) {
      const currentYear = new Date().getFullYear();
      const { error: insertError } = await supabase.from('terms').insert([
        {
          name: `SY${currentYear}-${currentYear + 1}`,
          is_current: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ]);

      if (insertError) throw insertError;
      console.log('Created default term');
    }

    return { success: true };
  } catch (error) {
    console.error('Error initializing database:', error);
    return { success: false, error };
  }
}
