// argon2id with the library defaults (OWASP-recommended parameters).
import { hash, verify } from '@node-rs/argon2';

export const MIN_PASSWORD_LENGTH = 12;

export const hashPassword = (password: string): Promise<string> => hash(password);

let dummyHash: Promise<string> | undefined;

/**
 * Verify a password. For unknown users pass `null`: a dummy hash is verified anyway, so
 * the response time does not reveal whether the email exists (AUTH-002/AC2).
 */
export async function verifyPassword(
  storedHash: string | null,
  password: string,
): Promise<boolean> {
  dummyHash ??= hash('dummy password for timing equality');
  const ok = await verify(storedHash ?? (await dummyHash), password).catch(() => false);
  return storedHash !== null && ok;
}
