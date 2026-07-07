function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function removeUndefinedFirestoreFields(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(item => removeUndefinedFirestoreFields(item));
  }

  if (!isRecord(value)) {
    return value;
  }

  const cleanedValue: Record<string, unknown> = {};

  for (const [key, entry] of Object.entries(value)) {
    if (entry !== undefined) {
      cleanedValue[key] = removeUndefinedFirestoreFields(entry);
    }
  }

  return cleanedValue;
}
