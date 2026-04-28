export interface AuditEventShell {
  organizationId: string;
  actorId: string;
  action: string;
  redacted: true;
}
