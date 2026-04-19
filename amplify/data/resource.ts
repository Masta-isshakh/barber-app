import { type ClientSchema, a, defineData } from '@aws-amplify/backend';
import { inviteBarber } from '../functions/invite-barber/resource';

const schema = a.schema({
  // ── Barber ──────────────────────────────────────────────────────────────
  BarberProfile: a
    .model({
      cognitoUsername: a.string().required(),
      fullName: a.string().required(),
      username: a.string().required(),
      email: a.email().required(),
      phone: a.string(),
      role: a.enum(['ADMIN', 'BARBER']),
      status: a.enum(['INVITED', 'ACTIVE', 'DISABLED']),
      specialty: a.string(),
      shiftLabel: a.string(),
      commissionRate: a.float(),
      bio: a.string(),
      joinedOn: a.date(),
      avatarColor: a.string(),
      invitationSentAt: a.datetime(),
      lastLoginAt: a.datetime(),
    })
    .authorization((allow) => [
      allow.group('admins'),
      allow.ownerDefinedIn('cognitoUsername').to(['read']),
    ]),

  // ── Service catalogue ───────────────────────────────────────────────────
  ServiceItem: a
    .model({
      name: a.string().required(),
      nameAr: a.string(),
      price: a.float().required(),
      durationMinutes: a.integer().required(),
      category: a.enum(['HAIRCUT', 'BEARD', 'COMBO', 'KIDS', 'TREATMENT', 'OTHER']),
      isActive: a.boolean().required(),
      sortOrder: a.integer(),
    })
    .authorization((allow) => [
      allow.group('admins'),
      allow.authenticated().to(['read']),
    ]),

  // ── Customer ────────────────────────────────────────────────────────────
  Customer: a
    .model({
      fullName: a.string().required(),
      phone: a.string(),
      email: a.email(),
      notes: a.string(),
      totalVisits: a.integer(),
      totalSpent: a.float(),
      lastVisitAt: a.datetime(),
    })
    .authorization((allow) => [
      allow.group('admins'),
      allow.authenticated().to(['create', 'read', 'update']),
    ]),

  // ── Appointment ─────────────────────────────────────────────────────────
  Appointment: a
    .model({
      barberId: a.id().required(),
      barberName: a.string().required(),
      customerId: a.id(),
      customerName: a.string(),
      customerPhone: a.string(),
      serviceIds: a.string().array(),
      serviceNames: a.string().array(),
      totalAmount: a.float(),
      scheduledAt: a.datetime().required(),
      durationMinutes: a.integer(),
      status: a.enum(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW']),
      notes: a.string(),
      transactionId: a.id(),
    })
    .authorization((allow) => [
      allow.group('admins'),
      allow.authenticated().to(['create', 'read', 'update']),
    ]),

  // ── Transaction (POS sale) ──────────────────────────────────────────────
  Transaction: a
    .model({
      receiptNumber: a.string().required(),
      barberId: a.id().required(),
      barberName: a.string().required(),
      customerId: a.id(),
      customerName: a.string(),
      appointmentId: a.id(),
      subtotal: a.float().required(),
      discountAmount: a.float(),
      discountPercent: a.float(),
      taxAmount: a.float(),
      total: a.float().required(),
      paymentMethod: a.enum(['CASH', 'CARD', 'QR', 'SPLIT']),
      paymentStatus: a.enum(['PENDING', 'PAID', 'REFUNDED', 'VOIDED']),
      cashReceived: a.float(),
      changeGiven: a.float(),
      cardLast4: a.string(),
      notes: a.string(),
      createdByCognitoUsername: a.string().required(),
      paidAt: a.datetime(),
    })
    .authorization((allow) => [
      allow.group('admins'),
      allow.authenticated().to(['create', 'read']),
    ]),

  // ── Transaction line items ──────────────────────────────────────────────
  TransactionItem: a
    .model({
      transactionId: a.id().required(),
      serviceId: a.id().required(),
      serviceName: a.string().required(),
      price: a.float().required(),
      quantity: a.integer().required(),
      lineTotal: a.float().required(),
    })
    .authorization((allow) => [
      allow.group('admins'),
      allow.authenticated().to(['create', 'read']),
    ]),

  // ── Shift ────────────────────────────────────────────────────────────────
  Shift: a
    .model({
      barberId: a.id().required(),
      barberName: a.string().required(),
      cognitoUsername: a.string().required(),
      startedAt: a.datetime().required(),
      endedAt: a.datetime(),
      status: a.enum(['OPEN', 'CLOSED']),
      totalRevenue: a.float(),
      totalClients: a.integer(),
    })
    .authorization((allow) => [
      allow.group('admins'),
      allow.ownerDefinedIn('cognitoUsername').to(['create', 'read', 'update']),
    ]),

  // ── Legacy RevenueEntry (kept for backwards compat) ─────────────────────
  RevenueEntry: a
    .model({
      barberId: a.id().required(),
      cognitoUsername: a.string().required(),
      barberName: a.string().required(),
      amount: a.float().required(),
      serviceLabel: a.string().required(),
      paymentMethod: a.enum(['CASH', 'CARD', 'TRANSFER']),
      notes: a.string(),
      earnedAt: a.datetime().required(),
    })
    .authorization((allow) => [
      allow.group('admins'),
      allow.ownerDefinedIn('cognitoUsername').identityClaim('cognito:username').to(['create', 'read']),
    ]),
  InviteBarberResponse: a.customType({
    success: a.boolean().required(),
    message: a.string().required(),
    temporaryPassword: a.string().required(),
    username: a.string().required(),
    email: a.email().required(),
    inviteLink: a.string().required(),
  }),
  inviteBarber: a
    .mutation()
    .arguments({
      fullName: a.string().required(),
      username: a.string().required(),
      email: a.email().required(),
      phone: a.string(),
      specialty: a.string().required(),
      shiftLabel: a.string(),
      commissionRate: a.float(),
      bio: a.string(),
      avatarColor: a.string(),
    })
    .returns(a.ref('InviteBarberResponse'))
    .authorization((allow) => [allow.group('admins')])
    .handler(a.handler.function(inviteBarber)),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});
