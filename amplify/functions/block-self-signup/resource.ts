import { defineFunction } from '@aws-amplify/backend';

export const blockSelfSignup = defineFunction({
  name: 'block-self-signup',
  entry: './handler.ts',
  timeoutSeconds: 15,
  memoryMB: 256,
  resourceGroupName: 'auth',
});