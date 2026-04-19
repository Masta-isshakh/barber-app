import { useEffect, useState } from 'react';
import { client } from '../lib/amplify';
import type { Transaction } from '../types';

export function useTransactions(dateFrom?: string, dateTo?: string) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchTransactions() {
    setLoading(true);
    try {
      const result = await client.models.Transaction.list();
      let data = (result.data ?? []) as unknown as Transaction[];

      if (dateFrom) {
        data = data.filter((t) => (t.paidAt ?? t.createdAt ?? '') >= dateFrom);
      }
      if (dateTo) {
        data = data.filter((t) => (t.paidAt ?? t.createdAt ?? '') <= dateTo);
      }

      // newest first
      data.sort((a, b) =>
        (b.paidAt ?? b.createdAt ?? '').localeCompare(a.paidAt ?? a.createdAt ?? ''),
      );
      setTransactions(data);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchTransactions(); }, [dateFrom, dateTo]);

  return { transactions, loading, error, refetch: fetchTransactions };
}
