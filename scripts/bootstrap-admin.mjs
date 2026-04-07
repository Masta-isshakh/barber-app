import { CognitoIdentityProviderClient, AdminAddUserToGroupCommand, AdminCreateUserCommand, AdminGetUserCommand } from '@aws-sdk/client-cognito-identity-provider';

const [userPoolId, username, email] = process.argv.slice(2);

if (!userPoolId || !username || !email) {
  console.error('Usage: node scripts/bootstrap-admin.mjs <userPoolId> <username> <email>');
  process.exit(1);
}

const client = new CognitoIdentityProviderClient({});

try {
  await client.send(
    new AdminCreateUserCommand({
      UserPoolId: userPoolId,
      Username: username,
      DesiredDeliveryMediums: ['EMAIL'],
      UserAttributes: [
        { Name: 'email', Value: email },
        { Name: 'email_verified', Value: 'true' },
        { Name: 'name', Value: username },
      ],
    }),
  );
} catch (error) {
  if (error.name !== 'UsernameExistsException') {
    throw error;
  }
}

await client.send(
  new AdminAddUserToGroupCommand({
    UserPoolId: userPoolId,
    Username: username,
    GroupName: 'admins',
  }),
);

const user = await client.send(
  new AdminGetUserCommand({
    UserPoolId: userPoolId,
    Username: username,
  }),
);

console.log(JSON.stringify({ username, status: user.UserStatus, group: 'admins' }, null, 2));