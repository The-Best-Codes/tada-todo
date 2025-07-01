import { createHash } from "crypto";

export function generateHash(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

export function compareHashes(
  hash1: string | undefined,
  hash2: string,
): boolean {
  return hash1 === hash2;
}
