import { env } from '../config/env.js';

/** SQL expression for "today" in the configured timezone (e.g. Asia/Bishkek). */
export function sqlToday() {
  return `(NOW() AT TIME ZONE '${env.tz}')::date`;
}
