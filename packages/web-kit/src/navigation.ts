/**
 * Only same-app paths are allowed as redirect targets after login (no open redirects):
 * "/schedule?x=1" is fine, "//evil.example" or "https://…" falls back.
 */
export function safeNext(next: string | null | undefined, fallback: string): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\'))
    return fallback;
  if (next.startsWith('/login') || next.startsWith('/logout') || next.startsWith('/register'))
    return fallback;
  return next;
}
