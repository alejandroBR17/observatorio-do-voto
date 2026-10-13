import { createHash } from 'node:crypto';
export const eventId = (prefix: string, value: string) =>
  prefix + ':' + createHash('sha256').update(value).digest('hex');
