import { type ClientSchema, a, defineData } from '@aws-amplify/backend';
import { inviteBarber } from '../functions/invite-barber/resource';

const schema = a.schema({
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
