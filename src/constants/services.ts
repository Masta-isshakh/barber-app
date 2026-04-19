import type { ServiceItem } from '../types';

// Default services seeded in the app – admin can edit/add from the dashboard
export const DEFAULT_SERVICES: Omit<ServiceItem, 'id'>[] = [
  { name: 'Haircut', nameAr: 'قص شعر', price: 50, durationMinutes: 30, category: 'HAIRCUT', isActive: true, sortOrder: 1 },
  { name: 'Hair + Beard', nameAr: 'شعر وذقن', price: 80, durationMinutes: 45, category: 'COMBO', isActive: true, sortOrder: 2 },
  { name: 'Beard Trim', nameAr: 'تشذيب اللحية', price: 40, durationMinutes: 20, category: 'BEARD', isActive: true, sortOrder: 3 },
  { name: 'Kids Haircut', nameAr: 'قص أطفال', price: 35, durationMinutes: 25, category: 'KIDS', isActive: true, sortOrder: 4 },
  { name: 'Beard Shave', nameAr: 'حلاقة ذقن', price: 45, durationMinutes: 25, category: 'BEARD', isActive: true, sortOrder: 5 },
  { name: 'Hair Wash', nameAr: 'غسيل شعر', price: 20, durationMinutes: 15, category: 'TREATMENT', isActive: true, sortOrder: 6 },
  { name: 'Hair Colour', nameAr: 'صبغة شعر', price: 120, durationMinutes: 60, category: 'TREATMENT', isActive: true, sortOrder: 7 },
  { name: 'Full Package', nameAr: 'باقة كاملة', price: 150, durationMinutes: 90, category: 'COMBO', isActive: true, sortOrder: 8 },
];

export const CATEGORY_LABELS: Record<string, string> = {
  HAIRCUT: 'Haircut',
  BEARD: 'Beard',
  COMBO: 'Combo',
  KIDS: 'Kids',
  TREATMENT: 'Treatment',
  OTHER: 'Other',
};

export const CATEGORY_ICONS: Record<string, string> = {
  HAIRCUT: '✂️',
  BEARD: '🪒',
  COMBO: '💈',
  KIDS: '👦',
  TREATMENT: '💆',
  OTHER: '✨',
};
