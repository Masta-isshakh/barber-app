import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exitCode = 1;
}

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

function tryRunAws(args) {
  try {
    return { ok: true, data: runAws(args) };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

function requireString(value, key) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Missing or invalid ${key} in amplify_outputs.json`);
  }
  return value.trim();
}

function parseAppSyncUrl(url) {
  const match = url.match(/^https:\/\/([a-z0-9]+)\.appsync-api\.([a-z0-9-]+)\.amazonaws\.com\/graphql$/i);
  if (!match) {
    throw new Error(`AppSync url format is invalid: ${url}`);
  }
  return {
    apiId: match[1],
    region: match[2],
  };
}

function main() {
  const raw = fs.readFileSync('amplify_outputs.json', 'utf8');
  const outputs = JSON.parse(raw);

  const auth = outputs.auth ?? {};
  const data = outputs.data ?? {};

  const userPoolId = requireString(auth.user_pool_id, 'auth.user_pool_id');
  const userPoolClientId = requireString(auth.user_pool_client_id, 'auth.user_pool_client_id');
  const identityPoolId = requireString(auth.identity_pool_id, 'auth.identity_pool_id');
  const authRegion = requireString(auth.aws_region, 'auth.aws_region');
  const appSyncUrl = requireString(data.url, 'data.url');

  const checks = [];

  const userPool = runAws([
    'cognito-idp',
    'describe-user-pool',
    '--user-pool-id',
    userPoolId,
    '--region',
    authRegion,
  ]);
  checks.push(`User pool exists: ${userPoolId} (${userPool.UserPool?.Name || 'unknown-name'})`);

  const clients = runAws([
    'cognito-idp',
    'list-user-pool-clients',
    '--user-pool-id',
    userPoolId,
    '--max-results',
    '60',
    '--region',
    authRegion,
  ]);
  const clientFound = (clients.UserPoolClients || []).some((c) => c.ClientId === userPoolClientId);
  if (!clientFound) {
    fail(`User pool client ${userPoolClientId} is not in pool ${userPoolId}`);
  } else {
    checks.push(`User pool client belongs to pool: ${userPoolClientId}`);
  }

  const identityPool = runAws([
    'cognito-identity',
    'describe-identity-pool',
    '--identity-pool-id',
    identityPoolId,
    '--region',
    authRegion,
  ]);
  if (identityPool.IdentityPoolId !== identityPoolId) {
    fail(`Identity pool mismatch: expected ${identityPoolId}, got ${identityPool.IdentityPoolId}`);
  } else {
    checks.push(`Identity pool exists: ${identityPoolId}`);
  }

  const parsed = parseAppSyncUrl(appSyncUrl);
  const apiResult = tryRunAws([
    'appsync',
    'get-graphql-api',
    '--api-id',
    parsed.apiId,
    '--region',
    parsed.region,
  ]);
  if (apiResult.ok) {
    const api = apiResult.data;
    const liveUrl = api.graphqlApi?.uris?.GRAPHQL;
    if (liveUrl !== appSyncUrl) {
      fail(`AppSync endpoint mismatch: outputs has ${appSyncUrl}, AWS has ${liveUrl}`);
    } else {
      checks.push(`AppSync endpoint matches: ${appSyncUrl}`);
    }

    const liveAuthType = api.graphqlApi?.authenticationType;
    if (liveAuthType !== 'AMAZON_COGNITO_USER_POOLS') {
      fail(`Unexpected AppSync auth type: ${liveAuthType}`);
    } else {
      checks.push(`AppSync auth type is AMAZON_COGNITO_USER_POOLS`);
    }

    const livePoolId = api.graphqlApi?.userPoolConfig?.userPoolId;
    if (livePoolId && livePoolId !== userPoolId) {
      fail(`AppSync user pool mismatch: outputs has ${userPoolId}, AppSync has ${livePoolId}`);
    } else {
      checks.push(`AppSync user pool linkage is consistent`);
    }
  } else {
    const stacks = runAws(['cloudformation', 'describe-stacks', '--region', authRegion]);
    const matched = (stacks.Stacks || []).find((stack) => {
      const out = Object.fromEntries((stack.Outputs || []).map((o) => [o.OutputKey, o.OutputValue]));
      return out.userPoolId === userPoolId || out.webClientId === userPoolClientId;
    });

    if (!matched) {
      fail(`Could not verify AppSync endpoint via CloudFormation fallback. Original AppSync error: ${apiResult.error}`);
    } else {
      const out = Object.fromEntries((matched.Outputs || []).map((o) => [o.OutputKey, o.OutputValue]));
      if (out.awsAppsyncApiEndpoint !== appSyncUrl) {
        fail(`AppSync endpoint mismatch: outputs has ${appSyncUrl}, stack has ${out.awsAppsyncApiEndpoint}`);
      } else {
        checks.push(`AppSync endpoint matches stack outputs (${matched.StackName})`);
      }
      if (out.userPoolId && out.userPoolId !== userPoolId) {
        fail(`Stack userPoolId mismatch: outputs has ${userPoolId}, stack has ${out.userPoolId}`);
      } else {
        checks.push(`User pool matches stack outputs (${matched.StackName})`);
      }
      checks.push(`Used CloudFormation fallback because AppSync read is not allowed for current AWS role`);
    }
  }

  console.log('Release config verification results:');
  for (const line of checks) {
    console.log(`- ${line}`);
  }

  if (process.exitCode) {
    process.exit(process.exitCode);
  }

  console.log('All checks passed.');
}

try {
  main();
} catch (error) {
  fail(error.message);
  process.exit(process.exitCode || 1);
}
