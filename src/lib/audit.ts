import { getCurrentUser } from 'aws-amplify/auth';
import { client } from './amplify';

export type AuditSeverity = 'INFO' | 'WARNING' | 'ERROR';
export type AuditStatus = 'SUCCESS' | 'FAILED';
export type AuditActorRole = 'ADMIN' | 'BARBER' | 'SYSTEM';

type AuditInput = {
  action: string;
  entityType: string;
  entityId?: string;
  message?: string;
  status?: AuditStatus;
  severity?: AuditSeverity;
  actorDisplayName?: string;
  actorRole?: AuditActorRole;
  metadata?: Record<string, unknown>;
};

export async function writeAuditLog(input: AuditInput) {
  try {
    const user = await getCurrentUser();
    const metadataJson = input.metadata ? JSON.stringify(input.metadata) : undefined;

    await client.models.AuditLog.create({
      actorUsername: user.username,
      actorDisplayName: input.actorDisplayName,
      actorRole: input.actorRole ?? 'SYSTEM',
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      status: input.status ?? 'SUCCESS',
      severity: input.severity ?? 'INFO',
      message: input.message,
      metadataJson,
      occurredAt: new Date().toISOString(),
    });
  } catch {
    // Audit should never block business flow.
  }
}
