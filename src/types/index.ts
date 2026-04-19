// ── Enums ────────────────────────────────────────────────────────────────────
export type Role = 'ADMIN' | 'BARBER';
export type BarberStatus = 'INVITED' | 'ACTIVE' | 'DISABLED';
export type ServiceCategory = 'HAIRCUT' | 'BEARD' | 'COMBO' | 'KIDS' | 'TREATMENT' | 'OTHER';
export type PaymentMethod = 'CASH' | 'CARD' | 'QR' | 'SPLIT';
export type PaymentStatus = 'PENDING' | 'PAID' | 'REFUNDED' | 'VOIDED';
export type AppointmentStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
export type ShiftStatus = 'OPEN' | 'CLOSED';

// ── Models ───────────────────────────────────────────────────────────────────
export type BarberProfile = {
  id: string;
  cognitoUsername: string;
  fullName: string;
  username: string;
  email: string;
  phone?: string;
  role: Role;
  status: BarberStatus;
  specialty?: string;
  shiftLabel?: string;
  commissionRate?: number;
  bio?: string;
  joinedOn?: string;
  avatarColor?: string;
};

export type ServiceItem = {
  id: string;
  name: string;
  nameAr?: string;
  price: number;
  durationMinutes: number;
  category: ServiceCategory;
  isActive: boolean;
  sortOrder?: number;
};

export type Customer = {
  id: string;
  fullName: string;
  phone?: string;
  email?: string;
  notes?: string;
  totalVisits?: number;
  totalSpent?: number;
  lastVisitAt?: string;
};

export type Appointment = {
  id: string;
  barberId: string;
  barberName: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  serviceIds?: string[];
  serviceNames?: string[];
  totalAmount?: number;
  scheduledAt: string;
  durationMinutes?: number;
  status: AppointmentStatus;
  notes?: string;
  transactionId?: string;
};

export type TransactionItem = {
  id?: string;
  transactionId?: string;
  serviceId: string;
  serviceName: string;
  price: number;
  quantity: number;
  lineTotal: number;
};

export type Transaction = {
  id: string;
  receiptNumber: string;
  barberId: string;
  barberName: string;
  customerId?: string;
  customerName?: string;
  appointmentId?: string;
  subtotal: number;
  discountAmount?: number;
  discountPercent?: number;
  taxAmount?: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  cashReceived?: number;
  changeGiven?: number;
  cardLast4?: string;
  notes?: string;
  createdByCognitoUsername: string;
  paidAt?: string;
  createdAt?: string;
};

export type Shift = {
  id: string;
  barberId: string;
  barberName: string;
  cognitoUsername: string;
  startedAt: string;
  endedAt?: string;
  status: ShiftStatus;
  totalRevenue?: number;
  totalClients?: number;
};

// ── POS cart types ────────────────────────────────────────────────────────────
export type CartItem = {
  service: ServiceItem;
  quantity: number;
};

export type CartState = {
  items: CartItem[];
  selectedBarber: BarberProfile | null;
  customer: Partial<Customer> | null;
  discountPercent: number;
};

// ── Navigation param lists ────────────────────────────────────────────────────
export type RootStackParamList = {
  Login: undefined;
  AdminTabs: undefined;
  BarberTabs: undefined;
};

export type AdminTabParamList = {
  POS: undefined;
  Appointments: undefined;
  Barbers: undefined;
  Reports: undefined;
  Customers: undefined;
  Services: undefined;
  Shifts: undefined;
  Users: undefined;
  Account: undefined;
};

export type BarberTabParamList = {
  MyPOS: undefined;
  MyAppointments: undefined;
  MyStats: undefined;
};
