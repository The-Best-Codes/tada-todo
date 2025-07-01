import { existsSync, mkdirSync, writeFileSync } from "fs";
import kleur from "kleur";
import { dirname, join } from "path";
import type { CommandOptions } from "../types.js";
import { findConfigFile, loadConfig } from "../utils/config.js";

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

    // Generate all saved files
    for (const savedFile of config.savedFiles) {
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
    }

    console.log(
      kleur.blue(
        `\nGeneration complete: ${generatedCount} files created, ${skippedCount} files skipped.`,
      ),
    );
  } catch (error) {
    console.log(kleur.red(`Error: ${error}`));
  }
}
