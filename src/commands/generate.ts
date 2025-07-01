import { existsSync, mkdirSync, writeFileSync } from "fs";
import kleur from "kleur";
import { dirname, join } from "path";
import type { CommandOptions } from "../types.js";
import { findConfigFile, loadConfig, saveConfig } from "../utils/config.js";
import { generateHash } from "../utils/hash.js";

export async function generateCommand(options: CommandOptions): Promise<void> {
  const currentDir = process.cwd();
  let configPath: string;
  let configType: "json" | "msgpack";

  if (options.config) {
    // Use provided config path
    configPath = options.config;
    configType =
      options.type === "auto" || !options.type
        ? configPath.endsWith(".json")
          ? "json"
          : "msgpack"
        : options.type;
  } else {
    // Search for config file
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
    // Load configuration
    const config = loadConfig(configPath, configType);
    const configDir = dirname(configPath);

    if (
      !config.saveInConfig ||
      !config.savedFiles ||
      config.savedFiles.length === 0
    ) {
      console.log(
        kleur.yellow(
          "No saved files found in configuration. Use `tada-todo new` to create TODO files.",
        ),
      );
      return;
    }

    let generatedCount = 0;
    let skippedCount = 0;
    let configUpdated = false;

    // Generate all saved files
    for (let i = 0; i < config.savedFiles.length; i++) {
      const savedFile = config.savedFiles[i];
      if (!savedFile) continue;

      const targetDir = join(configDir, savedFile.dirRelativeToConf);
      const targetPath = join(targetDir, savedFile.name);

      // Create directory if it doesn't exist
      if (!existsSync(targetDir)) {
        mkdirSync(targetDir, { recursive: true });
      }

      // Check if file already exists
      if (existsSync(targetPath)) {
        console.log(
          kleur.yellow(
            `Skipped: ${savedFile.name} already exists in ${savedFile.dirRelativeToConf}`,
          ),
        );
        skippedCount++;
        continue;
      }

      // Write the file
      writeFileSync(targetPath, savedFile.content);
      console.log(
        kleur.green(
          `Generated: ${savedFile.name} in ${savedFile.dirRelativeToConf}`,
        ),
      );
      generatedCount++;

      // Ensure hash is present in saved file
      if (!savedFile.hash) {
        config.savedFiles[i] = {
          ...savedFile,
          hash: generateHash(savedFile.content),
        };
        configUpdated = true;
      }
    }

    console.log(
      kleur.blue(
        `\nGeneration complete: ${generatedCount} files created, ${skippedCount} files skipped.`,
      ),
    );

    // Save config if hashes were added
    if (configUpdated) {
      saveConfig(config, configPath, configType);
      console.log(kleur.dim("Configuration updated with file hashes."));
    }
  } catch (error) {
    console.log(kleur.red(`Error: ${error}`));
  }
}
