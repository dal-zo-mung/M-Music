export function getRequestOrigin(req) {
  return `${req.protocol}://${req.get('host')}`;
}

export function normalizeReturnTo(input, origin) {
  try {
    if (typeof input !== 'string') return '/';

    const trimmed = input.trim();
    if (!trimmed || trimmed.startsWith('//')) {
      return '/';
    }

    const target = new URL(trimmed, origin);
    if (target.origin !== origin) {
      return '/';
    }

    return `${target.pathname}${target.search}${target.hash}` || '/';
  } catch {
    return '/';
  }
}
