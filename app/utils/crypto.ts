import crypto from "crypto";

export function hashPassword(password: string): string {
  // Deterministic SHA-256 hashing for Flat authentication
  return crypto.createHash("sha256").update(password).digest("hex");
}
