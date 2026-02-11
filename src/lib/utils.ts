import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { randomBytes } from 'crypto';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Cryptographically secure random number in [0, 1).
 * Drop-in replacement for Math.random() — uses Node.js crypto module
 * to prevent predictable/biased selection of questions.
 */
export function secureRandom(): number {
  const bytes = randomBytes(4);
  // Convert 4 bytes to unsigned 32-bit integer, then normalize to [0, 1)
  return bytes.readUInt32BE(0) / 0x100000000;
}
