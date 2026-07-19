import crypto from "crypto";

// Use a static salt to prevent simple rainbow table attacks on the flat passwords.
// In a real production app, this would be in an environment variable.
const SALT = "aajkiskibari-flat-salt-2026";

export function hashPassword(password: string): string {
  // Deterministic SHA-256 hashing for Flat authentication with salt
  return crypto.createHash("sha256").update(`${password}${SALT}`).digest("hex");
}
