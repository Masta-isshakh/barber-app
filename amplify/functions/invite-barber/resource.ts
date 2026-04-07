import { defineFunction } from '@aws-amplify/backend';

export const inviteBarber = defineFunction({
  name: 'invite-barber',
  entry: './handler.ts',
  timeoutSeconds: 30,
  memoryMB: 512,
  resourceGroupName: 'data',
});