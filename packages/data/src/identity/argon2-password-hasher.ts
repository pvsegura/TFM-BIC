import type { PasswordHasher } from "@tfm-bic/application";
import argon2 from "argon2";

/**
 * Argon2id (library default), library-default cost parameters — see
 * docs/adr/adr-006-authentication.md for why this library/algorithm was
 * chosen over Node's brand-new native `crypto.argon2`.
 */
export class Argon2PasswordHasher implements PasswordHasher {
  async hash(plainPassword: string): Promise<string> {
    return argon2.hash(plainPassword);
  }

  async verify(hash: string, plainPassword: string): Promise<boolean> {
    return argon2.verify(hash, plainPassword);
  }
}
