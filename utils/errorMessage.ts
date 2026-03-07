export const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message) {
    return normalize(error.message);
  }

  if (typeof error === 'string' && error.trim()) {
    return normalize(error);
  }

  if (error && typeof error === 'object') {
    const record = error as {
      message?: unknown;
      error?: { message?: unknown };
      details?: unknown;
    };

    if (typeof record.message === 'string' && record.message.trim()) {
      return normalize(record.message);
    }

    if (record.error && typeof record.error.message === 'string' && record.error.message.trim()) {
      return normalize(record.error.message);
    }

    if (typeof record.details === 'string' && record.details.trim()) {
      return normalize(record.details);
    }
  }

  return fallback;
};

const normalize = (message: string): string => {
  const singleLine = message.replace(/\s+/g, ' ').trim();
  const maxLen = 260;
  if (singleLine.length <= maxLen) return singleLine;
  return `${singleLine.slice(0, maxLen - 1)}...`;
};
