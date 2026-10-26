/** Plain-language names for audit log actions. Unknown actions show their code. */
export const AUDIT_ACTIONS: Record<string, string> = {
  "tenant.created": "Company created",
  "member.added": "Team member added",
  "member.role_changed": "Role changed",
  "member.removed": "Team member removed",
  "employees.insert": "Employees added",
  "employees.update": "Employees updated",
  "employees.delete": "Employees removed",
  "sample_data.loaded": "Sample data loaded",
  "sample_data.cleared": "Sample data removed",
  "sending.awareness_confirmed": "Employee notice confirmed",
  "sending.approved": "Sending approved by Helvax",
  "sending.approval_revoked": "Sending approval withdrawn by Helvax",
  "sending.enabled": "Sending turned on",
  "sending.disabled": "Sending turned off",
  "reply.reviewed": "Reply reviewed",
  "outcome.confirmed": "Result confirmed by a reviewer",
  "outcome.dismissed": "Result dismissed by a reviewer",
  "report.created": "Monthly report created",
  "report.sent": "Monthly report emailed",
  "platform.sending_enabled": "Platform sending turned on",
  "platform.sending_disabled": "Platform sending turned off",
};

export const auditLabel = (action: string) => AUDIT_ACTIONS[action] ?? action;

export function auditDetail(metadata: Record<string, unknown>): string {
  const parts: string[] = [];
  if (typeof metadata.count === "number") parts.push(`${metadata.count} ${metadata.count === 1 ? "person" : "people"}`);
  if (typeof metadata.role === "string") parts.push(`as ${metadata.role}`);
  if (typeof metadata.from === "string" && typeof metadata.to === "string") parts.push(`${metadata.from} → ${metadata.to}`);
  if (typeof metadata.category === "string") parts.push(metadata.category.replace(/_/g, " "));
  if (typeof metadata.reason === "string" && metadata.reason) parts.push(`“${metadata.reason}”`);
  return parts.join(" · ");
}
