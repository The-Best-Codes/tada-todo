import { existsSync, readFileSync } from "fs";
import kleur from "kleur";
import { dirname, relative } from "path";
import type { SavedFile } from "../types.js";
import { findConfigFile, loadConfig, saveConfig } from "./config.js";
import { compareHashes, generateHash } from "./hash.js";

export interface UpdateConfigOptions {
  config?: string;
  type?: "json" | "msgpack" | "auto";
  silent?: boolean;
}

/**
 * Updates a specific file in the configuration if the configuration is set to save files.
 * This should be called after modifying TODO files to keep the savedFiles in sync.
 */
export async function updateFileInConfig(
  filePath: string,
  options: UpdateConfigOptions = {},
): Promise<boolean> {
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
      // No config file found, nothing to update
      return false;
    }
    configPath = configResult.path;
    configType = configResult.type;
  }

  try {
    const config = loadConfig(configPath, configType);

    // If config is not set to save files, nothing to do
    if (!config.saveInConfig) {
      return false;
    }

    if (!config.savedFiles) {
      config.savedFiles = [];
    }

    const configDir = dirname(configPath);
    const hasChanges = await updateSpecificFileInConfig(
      filePath,
      config,
      configDir,
      options.silent || false,
    );

    if (hasChanges) {
      saveConfig(config, configPath, configType);
      if (!options.silent) {
        console.log(kleur.green("Configuration updated."));
      }
      return true;
    }

    return false;
  } catch (error) {
    if (!options.silent) {
      console.log(kleur.red(`Error updating configuration: ${error}`));
    }
    return false;
  }
}

async function updateSpecificFileInConfig(
  filePath: string,
  config: any,
  configDir: string,
  silent: boolean,
): Promise<boolean> {
  if (!existsSync(filePath)) {
    if (!silent) {
      console.log(kleur.red(`File not found: ${filePath}`));
    }
    return false;
  }

  const content = readFileSync(filePath, "utf-8");
  const hash = generateHash(content);

  // Get the relative path from config directory to the file's directory
  const fileDir = dirname(filePath);
  const relativePath = relative(configDir, fileDir);
  const fileName =
    filePath.split("/").pop() || filePath.split("\\").pop() || "";

  // Find existing saved file
  const existingIndex = config.savedFiles.findIndex(
    (f: SavedFile) =>
      f.name === fileName && f.dirRelativeToConf === (relativePath || "."),
  );

  if (existingIndex >= 0) {
    const existingFile = config.savedFiles[existingIndex];
    if (!compareHashes(existingFile.hash, hash)) {
      config.savedFiles[existingIndex] = {
        ...existingFile,
        content: content,
        hash: hash,
      };
      if (!silent) {
        console.log(kleur.green(`Updated in config: ${fileName}`));
      }
      return true;
    } else {
      // No changes needed
      return false;
    }
  } else {
    // Add new file to config
    const savedFile: SavedFile = {
      name: fileName,
      dirRelativeToConf: relativePath || ".",
      content: content,
      hash: hash,
    };
    config.savedFiles.push(savedFile);
    if (!silent) {
      console.log(kleur.green(`Added to config: ${fileName}`));
    }
    return true;
  }
}
