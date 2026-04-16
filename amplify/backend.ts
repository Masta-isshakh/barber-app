import { defineBackend } from '@aws-amplify/backend';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { blockSelfSignup } from './functions/block-self-signup/resource';
import { customMessage } from './functions/custom-message/resource';
import { inviteBarber } from './functions/invite-barber/resource';

/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
const backend = defineBackend({
  auth,
  data,
  blockSelfSignup,
  customMessage,
  inviteBarber,
});

backend.inviteBarber.addEnvironment(
  'AMPLIFY_AUTH_USERPOOL_ID',
  backend.auth.resources.userPool.userPoolId,
);

backend.inviteBarber.resources.lambda.addToRolePolicy(
  new PolicyStatement({
    actions: [
      'cognito-idp:AdminCreateUser',
      'cognito-idp:AdminAddUserToGroup',
      'cognito-idp:AdminGetUser',
      'cognito-idp:AdminSetUserPassword',
      'cognito-idp:AdminUpdateUserAttributes',
      'cognito-idp:ListUsers',
    ],
    resources: [backend.auth.resources.userPool.userPoolArn],
  }),
);
