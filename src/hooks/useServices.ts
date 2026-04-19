import { useEffect, useState } from 'react';
import { client } from '../lib/amplify';
import type { ServiceItem } from '../types';

export function useServices() {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchServices() {
    setLoading(true);
    try {
      const result = await client.models.ServiceItem.list({
        filter: { isActive: { eq: true } },
      });
      const sorted = ((result.data ?? []) as unknown as ServiceItem[]).sort(
        (a, b) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99),
      );
      setServices(sorted);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load services');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchServices(); }, []);

  return { services, loading, error, refetch: fetchServices };
}
