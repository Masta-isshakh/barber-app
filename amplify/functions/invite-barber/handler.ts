import {
  AdminAddUserToGroupCommand,
  AdminCreateUserCommand,
  CognitoIdentityProviderClient,
} from '@aws-sdk/client-cognito-identity-provider';

type InviteArgs = {
  fullName: string;
  username: string;
  email: string;
  phone?: string | null;
  specialty: string;
  shiftLabel?: string | null;
  commissionRate?: number | null;
  bio?: string | null;
  avatarColor?: string | null;
};

type AppSyncEvent = {
  arguments: InviteArgs;
};

const appLinkBase = 'barberapp://login';

export const handler = async (event: AppSyncEvent) => {
  const cognito = new CognitoIdentityProviderClient({});
  const userPoolId =
    process.env.AUTH_USERPOOL_ID ??
    process.env.AMPLIFY_AUTH_USERPOOL_ID ??
    Object.entries(process.env).find(([key]) => key.endsWith('_USERPOOL_ID'))?.[1];

  if (!userPoolId) {
    throw new Error('Missing Cognito user pool configuration for invitation flow.');
  }

  const args = event.arguments;
  const trimmedEmail = args.email.trim().toLowerCase();
  const normalizedUsername = trimmedEmail;
  const fullName = args.fullName.trim();

  if (!fullName || !trimmedEmail || !args.specialty.trim()) {
    throw new Error('Missing required invitation fields.');
  }

  await cognito.send(
    new AdminCreateUserCommand({
      UserPoolId: userPoolId,
      Username: normalizedUsername,
      DesiredDeliveryMediums: ['EMAIL'],
      ForceAliasCreation: false,
      UserAttributes: [
        { Name: 'email', Value: trimmedEmail },
        { Name: 'email_verified', Value: 'true' },
        { Name: 'name', Value: fullName },
      ],
    }),
  );

  await cognito.send(
    new AdminAddUserToGroupCommand({
      UserPoolId: userPoolId,
      Username: normalizedUsername,
      GroupName: 'barbers',
    }),
  );

  const temporaryPassword = 'Sent by email';

  return {
    success: true,
    message: `Invitation sent to ${trimmedEmail}`,
    temporaryPassword,
    username: normalizedUsername,
    email: trimmedEmail,
    inviteLink: `${appLinkBase}?email=${encodeURIComponent(trimmedEmail)}`,
  };
};