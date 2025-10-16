import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface GlobalStats {
  totalUsers: number;
  totalCertifications: number;
  totalCertificationsCompleted: number;
}

export const useGlobalStats = () => {
  const [stats, setStats] = useState<GlobalStats>({
    totalUsers: 0,
    totalCertifications: 0,
    totalCertificationsCompleted: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      setError(null);
      try {
        console.log('[useGlobalStats] Fetching stats...');
        
        // Fetch total users
        const { count: totalUsers, error: usersError } = await supabase
          .from('profiles')
          .select('id', { count: 'exact' });
        if (usersError) throw usersError;
        console.log('[useGlobalStats] Total users:', totalUsers);

        // Fetch total certifications available
        const { count: totalCertifications, error: certsError } = await supabase
          .from('certifications')
          .select('id', { count: 'exact' });
        if (certsError) throw certsError;
        console.log('[useGlobalStats] Total certifications:', totalCertifications);

        // Fetch total certifications completed across all users
        const { count: totalCertificationsCompleted, error: progressError, data: progressData } = await supabase
          .from('user_progress')
          .select('id', { count: 'exact' })
          .eq('status', 'completed');
        
        if (progressError) {
          console.error('[useGlobalStats] Error fetching completed certifications:', progressError);
          throw progressError;
        }
        
        console.log('[useGlobalStats] Completed certifications count:', totalCertificationsCompleted);
        console.log('[useGlobalStats] Progress data sample:', progressData?.slice(0, 3));

        setStats({
          totalUsers: totalUsers || 0,
          totalCertifications: totalCertifications || 0,
          totalCertificationsCompleted: totalCertificationsCompleted || 0,
        });
        
        console.log('[useGlobalStats] Stats set:', {
          totalUsers: totalUsers || 0,
          totalCertifications: totalCertifications || 0,
          totalCertificationsCompleted: totalCertificationsCompleted || 0,
        });
      } catch (err: any) {
        console.error("[useGlobalStats] Error fetching global stats:", err.message, err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return { stats, loading, error };
}; 