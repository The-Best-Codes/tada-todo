import { existsSync, readFileSync, writeFileSync } from "fs";
import kleur from "kleur";
import { dirname, join } from "path";
import type { AddDateOptions } from "../../types.js";
import { findConfigFile, loadConfig } from "../../utils/config.js";
import { getReadableDate } from "../../utils/date.js";
import { updateFileInConfig } from "../../utils/update-config.js";

export async function addDateCommand(
  date?: string,
  options: AddDateOptions = {},
): Promise<void> {
  const targetDate = date || getReadableDate();

  try {
    const todoFiles = await findTodoFiles(options);

    if (todoFiles.length === 0) {
      const message = options.global
        ? "No TODO files found in configuration. Run `tada-todo new` to create one first."
        : "No TODO file found in current directory. Run `tada-todo new` to create one first.";
      console.log(kleur.yellow(message));
      return;
    }

    let updatedCount = 0;

    for (const todoFile of todoFiles) {
      if (await addDateHeading(todoFile, targetDate)) {
        updatedCount++;
        // Update the file in configuration if applicable
        await updateFileInConfig(todoFile, {
          config: options.config,
          type: options.type,
          silent: true,
        });
      }
    }

    if (updatedCount > 0) {
      const message = options.global
        ? `Added date heading "${targetDate}" to ${updatedCount} TODO file(s).`
        : `Added date heading "${targetDate}" to TODO file.`;
      console.log(kleur.green(message));
    } else {
      const message = options.global
        ? `Date heading "${targetDate}" already exists in all TODO files.`
        : `Date heading "${targetDate}" already exists in TODO file.`;
      console.log(kleur.blue(message));
    }
  } catch (error) {
    console.log(kleur.red(`Error: ${error}`));
  }
}

async function findTodoFiles(options: AddDateOptions): Promise<string[]> {
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
      // If no config found, look for TODO.md in current directory
      const defaultTodoPath = join(currentDir, "TODO.md");
      if (existsSync(defaultTodoPath)) {
        return [defaultTodoPath];
      }
      throw new Error(
        "No configuration file found and no TODO.md in current directory. Run `tada-todo init` first.",
      );
    }
    configPath = configResult.path;
    configType = configResult.type;
  }

  const config = loadConfig(configPath, configType);
  const configDir = dirname(configPath);
  const todoFiles: string[] = [];

  // If global flag is set, use all saved files from config
  if (options.global && config.savedFiles && config.savedFiles.length > 0) {
    // Use saved files from config
    for (const savedFile of config.savedFiles) {
      const filePath = join(
        configDir,
        savedFile.dirRelativeToConf,
        savedFile.name,
      );
      if (existsSync(filePath)) {
        todoFiles.push(filePath);
      }
    }
  } else {
    // Only look for TODO file in current directory
    const defaultTodoPath = join(currentDir, config.newFileName || "TODO.md");
    if (existsSync(defaultTodoPath)) {
      todoFiles.push(defaultTodoPath);
    }
  }

  return todoFiles;
}

export async function addDateHeading(
  filePath: string,
  date: string,
): Promise<boolean> {
  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  // Check if date heading already exists
  const dateHeadingPattern = new RegExp(`^## ${escapeRegExp(date)}\\s*$`);
  const existingDateIndex = lines.findIndex((line) =>
    dateHeadingPattern.test(line),
  );

  if (existingDateIndex !== -1) {
    return false; // Date heading already exists
  }

  // Find the best place to insert the new date heading
  // Look for the first date heading and insert before it, or at the top
  let insertIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line && line.trim().startsWith("## ") && isDateHeading(line)) {
      insertIndex = i;
      break;
    }
    if (
      line &&
      (line.trim().startsWith("---") || line.trim().startsWith("----"))
    ) {
      insertIndex = i;
      break;
    }
  }

  // Insert the new date heading
  const newHeading = [`## ${date}`, "", ""];
  lines.splice(insertIndex, 0, ...newHeading);

  writeFileSync(filePath, lines.join("\n"));
  return true;
}

export function isDateHeading(line: string): boolean {
  const heading = line.substring(3).trim();
  // Simple check: if it contains month names or looks like a date
  const datePatterns = [
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\b/i,
    /\b\d{1,2}[,\s]+\d{4}\b/,
    /\b\d{4}[-/]\d{1,2}[-/]\d{1,2}\b/,
    /\b\d{1,2}[-/]\d{1,2}[-/]\d{4}\b/,
  ];

  return datePatterns.some((pattern) => pattern.test(heading));
}

export function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
