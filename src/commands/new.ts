import kleur from "kleur";
import { dirname } from "path";
import type { CommandOptions } from "../types.js";
import { findConfigFile, loadConfig, saveConfig } from "../utils/config.js";
import { createTodoFile } from "../utils/todo.js";

export async function newCommand(options: CommandOptions): Promise<void> {
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

    // Create the TODO file
    createTodoFile(config, currentDir, configDir);

    // If saveInConfig is true, update the config file
    if (config.saveInConfig) {
      saveConfig(config, configPath, configType);
      console.log(kleur.dim("Configuration updated with new file."));
    }
  } catch (error) {
    console.log(kleur.red(`Error: ${error}`));
  }
}
