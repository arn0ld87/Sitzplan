/**
 * Generates a new entity ID using crypto.randomUUID().
 * Wrapped for testability and a single point of change.
 */
export function newId(prefix?: string): string {
  const uuid = crypto.randomUUID();
  return prefix ? `${prefix}-${uuid}` : uuid;
}
