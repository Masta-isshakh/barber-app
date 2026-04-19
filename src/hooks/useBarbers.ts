import { useEffect, useState } from 'react';
import { client } from '../lib/amplify';
import type { BarberProfile } from '../types';

export function useBarbers() {
  const [barbers, setBarbers] = useState<BarberProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchBarbers() {
    setLoading(true);
    try {
      const result = await client.models.BarberProfile.list({
        filter: { status: { eq: 'ACTIVE' } },
      });
      setBarbers((result.data ?? []) as unknown as BarberProfile[]);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load barbers');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchBarbers(); }, []);

  return { barbers, loading, error, refetch: fetchBarbers };
}
