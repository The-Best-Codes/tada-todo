import { cancel, confirm, intro, isCancel, outro, text } from "@clack/prompts";
import { existsSync } from "fs";
import kleur from "kleur";
import type { InitOptions, TodoConfig } from "../types.js";
import { getConfigPath, saveConfig } from "../utils/config.js";

export async function initCommand(options: InitOptions): Promise<void> {
  intro(kleur.bgBlue(" tada-todo init "));

  // Check if config already exists
  if (existsSync("tada-todo.json") || existsSync("tada-todo.b")) {
    console.log(
      kleur.red("Configuration file already exists in this directory!"),
    );
    outro(kleur.red("Initialization cancelled."));
    return;
  }

  let config: TodoConfig;

  if (options.nonInteractive) {
    // Use defaults for non-interactive mode
    config = {
      newFileName: "TODO.md",
      humanReadable: false,
      saveInConfig: false,
    };
    console.log(
      kleur.dim("Using default configuration (non-interactive mode)"),
    );
  } else if (options.options) {
    // Parse options from command line
    config = parseOptionsString(options.options);
  } else {
    // Interactive mode
    config = await promptForConfig();
    if (!config) {
      cancel("Initialization cancelled.");
      return;
    }
  }

  // Save the configuration
  const configPath = getConfigPath(config.humanReadable);
  const configType = config.humanReadable ? "json" : "msgpack";

  try {
    saveConfig(config, configPath, configType);
    outro(kleur.green(`Configuration saved to ${configPath}`));
  } catch (error) {
    outro(kleur.red(`Failed to save configuration: ${error}`));
  }
}

async function promptForConfig(): Promise<TodoConfig | null> {
  const newFileName = await text({
    message: "What should new TODO files be called?",
    placeholder: "TODO.md",
    defaultValue: "TODO.md",
  });

  if (isCancel(newFileName)) return null;

  const humanReadable = await confirm({
    message: "Should the TODO lockfile be human-readable?",
    initialValue: false,
  });

  if (isCancel(humanReadable)) return null;

  const saveInConfig = await confirm({
    message: "Save TODO files in config?",
    initialValue: false,
  });

  if (isCancel(saveInConfig)) return null;

  return {
    newFileName: newFileName as string,
    humanReadable: humanReadable as boolean,
    saveInConfig: saveInConfig as boolean,
  };
}

function parseOptionsString(optionsStr: string): TodoConfig {
  const config: TodoConfig = {
    newFileName: "TODO.md",
    humanReadable: false,
    saveInConfig: false,
  };

  const pairs = optionsStr.split(",");
  for (const pair of pairs) {
    const [key, value] = pair.split("=").map((s) => s.trim());

    switch (key) {
      case "newFileName":
        config.newFileName = value;
        break;
      case "humanReadable":
        config.humanReadable = value.toLowerCase() === "true";
        break;
      case "saveInConfig":
        config.saveInConfig = value.toLowerCase() === "true";
        break;
      default:
        console.log(kleur.yellow(`Warning: Unknown option '${key}' ignored`));
    }
  }

  return config;
}
