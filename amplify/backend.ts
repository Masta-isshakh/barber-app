import { defineBackend } from '@aws-amplify/backend';
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
