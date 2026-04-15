import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { Amplify } from 'aws-amplify';
import { signIn, signOut } from 'aws-amplify/auth';

const email = process.env.ADMIN_EMAIL || 'mastaisshakh@gmail.com';
const password = process.env.ADMIN_PASSWORD || '';

function runAws(args) {
  try {
    const output = execFileSync('aws', args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return JSON.parse(output);
  } catch (error) {
    const stderr = error.stderr?.toString().trim();
    const stdout = error.stdout?.toString().trim();
    throw new Error(stderr || stdout || error.message);
  }
}

function line(name, status, detail) {
  const pad = status === 'PASS' ? 'PASS' : status === 'FAIL' ? 'FAIL' : 'INFO';
  console.log(`[${pad}] ${name}: ${detail}`);
}

async function main() {
  const outputs = JSON.parse(fs.readFileSync('amplify_outputs.json', 'utf8'));
  const auth = outputs.auth || {};

  const poolId = auth.user_pool_id;
  const clientId = auth.user_pool_client_id;
  const region = auth.aws_region;

  if (!poolId || !clientId || !region) {
    line('Outputs', 'FAIL', 'Missing auth fields in amplify_outputs.json');
    process.exit(1);
  }

  line('Outputs', 'PASS', `pool=${poolId}, client=${clientId}, region=${region}`);

  const client = runAws([
    'cognito-idp',
    'describe-user-pool-client',
    '--user-pool-id',
    poolId,
    '--client-id',
    clientId,
    '--region',
    region,
    '--output',
    'json',
  ]);

  const flows = client.UserPoolClient?.ExplicitAuthFlows || [];
  const hasSrp = flows.includes('ALLOW_USER_SRP_AUTH');
  line('Client SRP Flow', hasSrp ? 'PASS' : 'FAIL', JSON.stringify(flows));

  const users = runAws([
    'cognito-idp',
    'list-users',
    '--user-pool-id',
    poolId,
    '--region',
    region,
    '--output',
    'json',
  ]).Users || [];

  const user = users.find((u) => (u.Attributes || []).find((a) => a.Name === 'email')?.Value === email);

  if (!user) {
    line('User Exists', 'FAIL', `${email} not found in active pool`);
    process.exit(1);
  }

  const username = user.Username;
  const status = user.UserStatus;
  const enabled = user.Enabled;
  const emailVerified = (user.Attributes || []).find((a) => a.Name === 'email_verified')?.Value;

  line('User Exists', 'PASS', `username=${username}`);
  line('User Status', status === 'CONFIRMED' && enabled ? 'PASS' : 'FAIL', `status=${status}, enabled=${enabled}`);
  line('Email Verified', emailVerified === 'true' ? 'PASS' : 'FAIL', `email_verified=${emailVerified}`);

  const groups = runAws([
    'cognito-idp',
    'admin-list-groups-for-user',
    '--user-pool-id',
    poolId,
    '--username',
    username,
    '--region',
    region,
    '--output',
    'json',
  ]).Groups || [];

  const groupNames = groups.map((g) => g.GroupName);
  line('Admins Group', groupNames.includes('admins') ? 'PASS' : 'FAIL', groupNames.join(', ') || 'none');

  if (!password) {
    line('Sign-In Test', 'INFO', 'Skipped (set ADMIN_PASSWORD env var to test credentials)');
    return;
  }

  Amplify.configure(outputs);
  try {
    const result = await signIn({ username: email, password });
    line('Amplify Sign-In', result.nextStep?.signInStep === 'DONE' ? 'PASS' : 'FAIL', JSON.stringify(result.nextStep));
    if (result.isSignedIn) {
      await signOut();
    }
  } catch (error) {
    line('Amplify Sign-In', 'FAIL', `${error?.name || 'Error'}: ${error?.message || String(error)}`);
    process.exitCode = 1;
  }
}

await main();
