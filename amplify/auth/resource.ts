import { defineAuth } from '@aws-amplify/backend';
import { blockSelfSignup } from '../functions/block-self-signup/resource';
import { customMessage } from '../functions/custom-message/resource';

/**
 * Define and configure your auth resource
 * @see https://docs.amplify.aws/gen2/build-a-backend/auth
 */
export const auth = defineAuth({
  loginWith: {
    email: true,
  },
  groups: ['admins', 'barbers'],
  triggers: {
    preSignUp: blockSelfSignup,
    customMessage,
  },
});
