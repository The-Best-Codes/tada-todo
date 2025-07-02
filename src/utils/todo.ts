import { existsSync, writeFileSync } from "fs";
import kleur from "kleur";
import { join, relative } from "path";
import type { SavedFile, TodoConfig } from "../types.js";
import { getReadableDate } from "./date.js";
import { generateHash } from "./hash.js";

export function generateTodoContent(): string {
  const date = getReadableDate();

  return `## ${date}

- [ ] This is a task that needs done.
- [x] This task is finished.

---

Add new items to the top of the file.
Generated on ${date} by tada-todo CLI.
`;
}

export function createTodoFile(
  config: TodoConfig,
  currentDir: string,
  configDir: string,
): void {
  const todoPath = join(currentDir, config.newFileName);

  if (existsSync(todoPath)) {
    console.log(
      kleur.yellow(
        `Warning: ${config.newFileName} already exists in ${currentDir}`,
      ),
    );
    return;
  }

  const content = generateTodoContent();
  writeFileSync(todoPath, content);

  console.log(kleur.green(`Created ${config.newFileName} in ${currentDir}`));

  // If saveInConfig is true, add to saved files
  if (config.saveInConfig) {
    const relativePath = relative(configDir, currentDir);
    const savedFile: SavedFile = {
      name: config.newFileName,
      dirRelativeToConf: relativePath || ".",
      content: content,
      hash: generateHash(content),
    };

    if (!config.savedFiles) {
      config.savedFiles = [];
    }

    // Check if file already exists in saved files
    const existingIndex = config.savedFiles.findIndex(
      (f) =>
        f.name === savedFile.name &&
        f.dirRelativeToConf === savedFile.dirRelativeToConf,
    );

    if (existingIndex >= 0) {
      config.savedFiles[existingIndex] = savedFile;
    } else {
      config.savedFiles.push(savedFile);
    }
  }
}
