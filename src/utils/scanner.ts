import { existsSync, readdirSync, readFileSync, statSync } from "fs";
import { join, relative } from "path";
import type { SavedFile } from "../types.js";
import { generateHash } from "./hash.js";

export function scanForTodoFiles(
  rootDir: string,
  fileName: string,
  maxDepth: number = 10,
): SavedFile[] {
  const foundFiles: SavedFile[] = [];

  function scanDirectory(dir: string, depth: number = 0): void {
    if (depth > maxDepth) return;

    try {
      const entries = readdirSync(dir);

      for (const entry of entries) {
        const fullPath = join(dir, entry);

        try {
          const stat = statSync(fullPath);

          if (stat.isDirectory()) {
            // Skip common directories that shouldn't contain TODO files
            if (
              !["node_modules", ".git", "dist", "build", ".next"].includes(
                entry,
              )
            ) {
              scanDirectory(fullPath, depth + 1);
            }
          } else if (stat.isFile() && entry === fileName) {
            const content = readFileSync(fullPath, "utf-8");
            const relativePath = relative(rootDir, dir);

            foundFiles.push({
              name: fileName,
              dirRelativeToConf: relativePath || ".",
              content: content,
              hash: generateHash(content),
            });
          }
        } catch (error) {
          // Skip files/directories we can't access
          continue;
        }
      }
    } catch (error) {
      // Skip directories we can't read
      return;
    }
  }

  scanDirectory(rootDir);
  return foundFiles;
}

export function fileExists(configDir: string, savedFile: SavedFile): boolean {
  const filePath = join(configDir, savedFile.dirRelativeToConf, savedFile.name);
  return existsSync(filePath);
}

export function readFileContent(
  configDir: string,
  savedFile: SavedFile,
): string | null {
  const filePath = join(configDir, savedFile.dirRelativeToConf, savedFile.name);

  try {
    if (!existsSync(filePath)) return null;
    return readFileSync(filePath, "utf-8");
  } catch (error) {
    return null;
  }
}
