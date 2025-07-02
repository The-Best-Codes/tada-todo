import { existsSync, readFileSync, writeFileSync } from "fs";
import kleur from "kleur";
import { dirname, join } from "path";
import type { AddTaskOptions } from "../../types.js";
import { findConfigFile, loadConfig } from "../../utils/config.js";
import { getReadableDate } from "../../utils/date.js";
import { updateFileInConfig } from "../../utils/update-config.js";
import { addDateHeading, escapeRegExp, isDateHeading } from "./add-date.js";

export async function addTaskCommand(
  task: string,
  date?: string,
  options: AddTaskOptions = {},
): Promise<void> {
  const targetDate = date || getReadableDate();

  try {
    const todoFiles = await findTodoFiles(options);

    if (todoFiles.length === 0) {
      console.log(
        kleur.yellow(
          "No TODO files found. Run `tada-todo new` to create one first.",
        ),
      );
      return;
    }

    let updatedCount = 0;

    for (const todoFile of todoFiles) {
      if (await addTaskToDate(todoFile, task, targetDate, options)) {
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
      console.log(
        kleur.green(
          `Added task "${task}" to ${updatedCount} TODO file(s) under date "${targetDate}".`,
        ),
      );
    } else {
      console.log(
        kleur.yellow(
          `Could not add task to any TODO files. Date "${targetDate}" may not exist.`,
        ),
      );
    }
  } catch (error) {
    console.log(kleur.red(`Error: ${error}`));
  }
}

async function findTodoFiles(options: AddTaskOptions): Promise<string[]> {
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

  if (config.savedFiles && config.savedFiles.length > 0) {
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
    // Look for default TODO file in current directory
    const defaultTodoPath = join(currentDir, config.newFileName || "TODO.md");
    if (existsSync(defaultTodoPath)) {
      todoFiles.push(defaultTodoPath);
    }
  }

  return todoFiles;
}

async function addTaskToDate(
  filePath: string,
  task: string,
  date: string,
  options: AddTaskOptions = {},
): Promise<boolean> {
  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  // Find the date heading
  const dateHeadingPattern = new RegExp(`^## ${escapeRegExp(date)}\\s*$`);
  let dateIndex = lines.findIndex((line) => dateHeadingPattern.test(line));

  if (dateIndex === -1) {
    // If date doesn't exist, try to create it (unless disabled by flag)
    if (options.noAutoCreateDate) {
      // Try to find similar dates using simple string matching
      const availableDates = lines
        .filter((line) => line.startsWith("## ") && isDateHeading(line))
        .map((line) => line.substring(3).trim());

      if (availableDates.length > 0) {
        const suggestion = findClosestDate(date, availableDates);
        console.log(kleur.yellow(`Date "${date}" not found in ${filePath}.`));
        if (suggestion) {
          console.log(kleur.blue(`Did you mean "${suggestion}"?`));
        }
      } else {
        console.log(kleur.yellow(`Date "${date}" not found in ${filePath}.`));
      }

      return false;
    } else {
      // Auto-create the date heading
      console.log(
        kleur.blue(`Creating date heading "${date}" in ${filePath}.`),
      );
      await addDateHeading(filePath, date);

      // Re-read the file to get the updated content
      const updatedContent = readFileSync(filePath, "utf-8");
      const updatedLines = updatedContent.split("\n");
      dateIndex = updatedLines.findIndex((line) =>
        dateHeadingPattern.test(line),
      );

      if (dateIndex === -1) {
        console.log(
          kleur.red(`Failed to create date heading "${date}" in ${filePath}.`),
        );
        return false;
      }

      // Update lines reference to the new content
      lines.length = 0;
      lines.push(...updatedLines);
    }
  }

  // Find where to insert the task (after the date heading)
  let insertIndex = dateIndex + 1;

  // Ensure there's a blank line after the date heading
  if (insertIndex < lines.length && lines[insertIndex]?.trim() !== "") {
    // No blank line exists, insert one
    lines.splice(insertIndex, 0, "");
    insertIndex++;
  } else if (insertIndex < lines.length && lines[insertIndex]?.trim() === "") {
    // Blank line exists, move past it
    insertIndex++;
  } else {
    // We're at the end of the file, add a blank line
    lines.splice(insertIndex, 0, "");
    insertIndex++;
  }

  // Insert the task at the beginning of the task list for this date
  const taskLine = `- [ ] ${task}`;
  lines.splice(insertIndex, 0, taskLine);

  writeFileSync(filePath, lines.join("\n"));
  return true;
}

function findClosestDate(
  target: string,
  availableDates: string[],
): string | null {
  // Simple string similarity - find the date with the most common words
  const targetWords = target.toLowerCase().split(/\s+/);
  let bestMatch = null;
  let bestScore = 0;

  for (const date of availableDates) {
    const dateWords = date.toLowerCase().split(/\s+/);
    const commonWords = targetWords.filter((word) => dateWords.includes(word));
    const score =
      commonWords.length / Math.max(targetWords.length, dateWords.length);

    if (score > bestScore) {
      bestScore = score;
      bestMatch = date;
    }
  }

  return bestScore > 0.3 ? bestMatch : null;
}
