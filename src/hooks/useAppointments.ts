import { useEffect, useState } from 'react';
import { client } from '../lib/amplify';
import type { Appointment } from '../types';

export function useAppointments(dateStr?: string) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchAppointments() {
    setLoading(true);
    try {
      const result = await client.models.Appointment.list();
      let data = (result.data ?? []) as unknown as Appointment[];

      if (dateStr) {
        // filter by day prefix e.g. "2026-04-19"
        data = data.filter((a) => a.scheduledAt.startsWith(dateStr));
      }

      data.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
      setAppointments(data);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load appointments');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchAppointments(); }, [dateStr]);

  return { appointments, loading, error, refetch: fetchAppointments };
}
