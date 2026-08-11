export const MAX_ADMIN_POINT_AMOUNT = 1_000_000;

export type AdminUserPointOperation = 'add' | 'remove' | 'set';

export interface AdminUserPointAdjustmentRequest {
  uid: string;
  operation: AdminUserPointOperation;
  amount: number;
  reason: string;
}

export interface AdminUserPointAdjustmentPlan {
  delta: number;
  previousTotal: number;
  newTotal: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseAdminUserPointAdjustmentRequest(value: unknown): AdminUserPointAdjustmentRequest {
  if (!isRecord(value)) {
    throw new Error('User point adjustment must be an object.');
  }

  const uid = typeof value['uid'] === 'string' ? value['uid'].trim() : '';
  const operation = value['operation'];
  const amount = value['amount'];
  const reason = typeof value['reason'] === 'string' ? value['reason'].trim() : '';

  if (!uid) {
    throw new Error('User uid is required.');
  }

  if (operation !== 'add' && operation !== 'remove' && operation !== 'set') {
    throw new Error('Point operation must be add, remove, or set.');
  }

  if (typeof amount !== 'number'
    || !Number.isSafeInteger(amount)
    || amount < (operation === 'set' ? 0 : 1)
    || amount > MAX_ADMIN_POINT_AMOUNT) {
    const minimum = operation === 'set' ? 0 : 1;
    throw new Error(`Point amount must be a whole number from ${minimum} to ${MAX_ADMIN_POINT_AMOUNT}.`);
  }

  if (reason.length < 3 || reason.length > 240) {
    throw new Error('Adjustment reason must be between 3 and 240 characters.');
  }

  return {uid, operation, amount, reason};
}

export function planAdminUserPointAdjustment(
  currentTotal: number,
  operation: AdminUserPointOperation,
  amount: number
): AdminUserPointAdjustmentPlan {
  if (!Number.isSafeInteger(currentTotal) || currentTotal < 0) {
    throw new Error('The current point balance is invalid.');
  }

  const delta = operation === 'add'
    ? amount
    : operation === 'remove'
      ? -amount
      : amount - currentTotal;
  const newTotal = currentTotal + delta;

  if (!Number.isSafeInteger(newTotal) || newTotal < 0 || newTotal > MAX_ADMIN_POINT_AMOUNT) {
    throw new Error(`The resulting point balance must be a whole number from 0 to ${MAX_ADMIN_POINT_AMOUNT}.`);
  }

  if (delta === 0) {
    throw new Error('The requested adjustment does not change the point balance.');
  }

  return {
    delta,
    previousTotal: currentTotal,
    newTotal,
  };
}
