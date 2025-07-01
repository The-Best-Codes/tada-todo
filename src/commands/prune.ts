import {
  cancel,
  confirm,
  intro,
  isCancel,
  multiselect,
  outro,
} from "@clack/prompts";
import kleur from "kleur";
import { dirname } from "path";
import type { CommandOptions, SavedFile } from "../types.js";
import { findConfigFile, loadConfig, saveConfig } from "../utils/config.js";
import { fileExists } from "../utils/scanner.js";

export async function pruneCommand(
  options: CommandOptions = {},
): Promise<void> {
  intro(kleur.bgRed(" tada-todo prune "));

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
      outro(kleur.red("Prune cancelled."));
      return;
    }
    configPath = configResult.path;
    configType = configResult.type;
  }

  try {
    const config = loadConfig(configPath, configType);
    const configDir = dirname(configPath);

    if (
      !config.saveInConfig ||
      !config.savedFiles ||
      config.savedFiles.length === 0
    ) {
      console.log(kleur.yellow("No saved files found in configuration."));
      outro(kleur.blue("Nothing to prune."));
      return;
    }

    // Find files that don't exist on filesystem
    const missingFiles: SavedFile[] = [];

    for (const savedFile of config.savedFiles) {
      if (!fileExists(configDir, savedFile)) {
        missingFiles.push(savedFile);
      }
    }

    if (missingFiles.length === 0) {
      console.log(kleur.green("All saved files exist on filesystem."));
      outro(kleur.blue("Nothing to prune."));
      return;
    }

    console.log(
      kleur.yellow(
        `Found ${missingFiles.length} saved file(s) that no longer exist on filesystem:`,
      ),
    );

    // Create options for multiselect
    const selectOptions = missingFiles.map((file, index) => ({
      value: index,
      label: `${file.name} in ${file.dirRelativeToConf}`,
      hint: "Missing from filesystem",
    }));

    const selectedIndices = await multiselect({
      message: "Select files to remove from configuration:",
      options: selectOptions,
      required: false,
    });

    if (isCancel(selectedIndices)) {
      cancel("Prune cancelled.");
      return;
    }

    if (!selectedIndices || selectedIndices.length === 0) {
      console.log(kleur.blue("No files selected."));
      outro(kleur.blue("Prune cancelled."));
      return;
    }

    // Show warning and get confirmation
    console.log(
      kleur.red(
        "\n⚠️  WARNING: This will permanently remove the selected files from your configuration!",
      ),
    );
    console.log(kleur.yellow("Selected files:"));

    const selectedFiles = (selectedIndices as number[])
      .map((i) => missingFiles[i])
      .filter((file) => file !== undefined);

    selectedFiles.forEach((file) => {
      console.log(
        kleur.yellow(`  - ${file.name} in ${file.dirRelativeToConf}`),
      );
    });

    const confirmPrune = await confirm({
      message:
        "Are you sure you want to remove these files from the configuration?",
      initialValue: false,
    });

    if (isCancel(confirmPrune) || !confirmPrune) {
      cancel("Prune cancelled.");
      return;
    }

    // Remove selected files from configuration
    const filesToRemove = new Set(selectedFiles);
    config.savedFiles = config.savedFiles.filter(
      (savedFile: SavedFile) => !filesToRemove.has(savedFile),
    );

    // Save updated configuration
    saveConfig(config, configPath, configType);

    console.log(
      kleur.green(
        `\nRemoved ${selectedFiles.length} file(s) from configuration.`,
      ),
    );
    outro(kleur.green("Prune completed successfully."));
  } catch (error) {
    outro(kleur.red(`Error: ${error}`));
  }
}
