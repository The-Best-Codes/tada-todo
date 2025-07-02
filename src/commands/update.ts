import kleur from "kleur";
import { dirname, join } from "path";
import type { CommandOptions, SavedFile } from "../types.js";
import { findConfigFile, loadConfig, saveConfig } from "../utils/config.js";
import { compareHashes, generateHash } from "../utils/hash.js";
import { readFileContent, scanForTodoFiles } from "../utils/scanner.js";
import { updateFileInConfig } from "../utils/update-config.js";

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
      // Update specific file using the shared utility
      const filePath = join(currentDir, file);
      hasChanges = await updateFileInConfig(filePath, {
        config: configPath,
        type: configType,
        silent: false,
      });
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
