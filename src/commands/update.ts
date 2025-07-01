import { existsSync, readFileSync } from "fs";
import kleur from "kleur";
import { dirname, join, relative } from "path";
import type { CommandOptions, SavedFile } from "../types.js";
import { findConfigFile, loadConfig, saveConfig } from "../utils/config.js";
import { compareHashes, generateHash } from "../utils/hash.js";
import { readFileContent, scanForTodoFiles } from "../utils/scanner.js";

interface UpdateOptions extends CommandOptions {
  scan?: boolean;
}

export async function updateCommand(
  file?: string,
  options: UpdateOptions = {},
): Promise<void> {
  const currentDir = process.cwd();
  let configPath: string;
  let configType: "json" | "msgpack";

  if (options.config) {
    configPath = options.config;
    configType =
      options.type === "auto" || !options.type
        ? configPath.endsWith(".json")
          ? "json"
          : "msgpack"
        : options.type;
  } else {
    const configResult = findConfigFile(currentDir);
    if (!configResult) {
      console.log(
        kleur.red("No configuration file found. Run `tada-todo init` first."),
      );
      return;
    }
    configPath = configResult.path;
    configType = configResult.type;
  }

  try {
    const config = loadConfig(configPath, configType);
    const configDir = dirname(configPath);
    let hasChanges = false;

    if (!config.saveInConfig) {
      console.log(
        kleur.yellow(
          "Configuration is not set to save files. Nothing to update.",
        ),
      );
      return;
    }

    if (!config.savedFiles) {
      config.savedFiles = [];
    }

    if (file) {
      // Update specific file
      hasChanges = await updateSpecificFile(
        file,
        config,
        configDir,
        currentDir,
      );
    } else {
      // Update all saved files
      hasChanges = await updateAllSavedFiles(config, configDir);
    }

    if (options.scan) {
      // Scan for new TODO files
      const scanChanges = await scanForNewFiles(config, configDir);
      hasChanges = hasChanges || scanChanges;
    }

    if (hasChanges) {
      saveConfig(config, configPath, configType);
      console.log(kleur.green("Configuration updated successfully."));
    } else {
      console.log(kleur.blue("No changes detected."));
    }
  } catch (error) {
    console.log(kleur.red(`Error: ${error}`));
  }
}

async function updateSpecificFile(
  file: string,
  config: any,
  configDir: string,
  currentDir: string,
): Promise<boolean> {
  const filePath = join(currentDir, file);

  if (!existsSync(filePath)) {
    console.log(kleur.red(`File not found: ${file}`));
    return false;
  }

  const content = readFileSync(filePath, "utf-8");
  const hash = generateHash(content);
  const relativePath = relative(configDir, currentDir);

  // Find existing saved file
  const existingIndex = config.savedFiles.findIndex(
    (f: SavedFile) =>
      f.name === file && f.dirRelativeToConf === (relativePath || "."),
  );

  if (existingIndex >= 0) {
    const existingFile = config.savedFiles[existingIndex];
    if (!compareHashes(existingFile.hash, hash)) {
      config.savedFiles[existingIndex] = {
        ...existingFile,
        content: content,
        hash: hash,
      };
      console.log(kleur.green(`Updated: ${file}`));
      return true;
    } else {
      console.log(kleur.blue(`No changes: ${file}`));
      return false;
    }
  } else {
    // Add new file
    const savedFile: SavedFile = {
      name: file,
      dirRelativeToConf: relativePath || ".",
      content: content,
      hash: hash,
    };
    config.savedFiles.push(savedFile);
    console.log(kleur.green(`Added: ${file}`));
    return true;
  }
}

async function updateAllSavedFiles(
  config: any,
  configDir: string,
): Promise<boolean> {
  let hasChanges = false;

  for (let i = 0; i < config.savedFiles.length; i++) {
    const savedFile = config.savedFiles[i];
    const content = readFileContent(configDir, savedFile);

    if (content === null) {
      console.log(
        kleur.yellow(
          `File not found: ${savedFile.name} in ${savedFile.dirRelativeToConf}`,
        ),
      );
      continue;
    }

    const hash = generateHash(content);

    if (!compareHashes(savedFile.hash, hash)) {
      config.savedFiles[i] = {
        ...savedFile,
        content: content,
        hash: hash,
      };
      console.log(
        kleur.green(
          `Updated: ${savedFile.name} in ${savedFile.dirRelativeToConf}`,
        ),
      );
      hasChanges = true;
    }
  }

  return hasChanges;
}

async function scanForNewFiles(
  config: any,
  configDir: string,
): Promise<boolean> {
  console.log(kleur.blue("Scanning for TODO files..."));

  const foundFiles = scanForTodoFiles(configDir, config.newFileName);
  let hasChanges = false;

  for (const foundFile of foundFiles) {
    // Check if this file is already in savedFiles
    const exists = config.savedFiles.some(
      (saved: SavedFile) =>
        saved.name === foundFile.name &&
        saved.dirRelativeToConf === foundFile.dirRelativeToConf,
    );

    if (!exists) {
      config.savedFiles.push(foundFile);
      console.log(
        kleur.green(
          `Added from scan: ${foundFile.name} in ${foundFile.dirRelativeToConf}`,
        ),
      );
      hasChanges = true;
    }
  }

  if (!hasChanges) {
    console.log(kleur.blue("No new files found during scan."));
  }

  return hasChanges;
}
