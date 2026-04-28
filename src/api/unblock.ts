const MATCH_SERVER = '/unblock-api';

export interface UnblockMatchResult {
  url: string | null;
  source: string | null;
  br: number;
  size: number;
}

export async function tryUnblockMatch(id: number, sources: string[]): Promise<UnblockMatchResult> {
  const defaultResult: UnblockMatchResult = { url: null, source: null, br: 0, size: 0 };
  if (!id) return defaultResult;

  try {
    const res = await fetch(
      `${MATCH_SERVER}/match?id=${id}&sources=${sources.join(',')}`,
      { signal: AbortSignal.timeout(15000) },
    );
    if (!res.ok) return defaultResult;
    return await res.json() as UnblockMatchResult;
  } catch {
    return defaultResult;
  }
}
