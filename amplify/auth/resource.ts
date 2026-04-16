import { defineAuth } from '@aws-amplify/backend';
import { blockSelfSignup } from '../functions/block-self-signup/resource';
import { customMessage } from '../functions/custom-message/resource';
import { inviteBarber } from '../functions/invite-barber/resource';

/**
 * Define and configure your auth resource
 * @see https://docs.amplify.aws/gen2/build-a-backend/auth
 */
export const auth = defineAuth({
  loginWith: {
    email: true,
  },
  groups: ['admins', 'barbers'],
  access: (allow) => [allow.resource(inviteBarber).to(['createUser', 'addUserToGroup'])],
  triggers: {
    preSignUp: blockSelfSignup,
    customMessage,
  },
});
