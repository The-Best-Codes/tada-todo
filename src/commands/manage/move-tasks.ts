import { existsSync, readFileSync, writeFileSync } from "fs";
import kleur from "kleur";
import { dirname, join } from "path";
import type { MoveTasksOptions } from "../../types.js";
import { findConfigFile, loadConfig } from "../../utils/config.js";
import { getReadableDate } from "../../utils/date.js";
import { updateFileInConfig } from "../../utils/update-config.js";
import { addDateHeading, isDateHeading } from "./add-date.js";

export async function moveTasksCommand(
  targetDate?: string,
  options: MoveTasksOptions = {},
): Promise<void> {
  const finalTargetDate = targetDate || getReadableDate();

  try {
    const todoFiles = await findTodoFiles(options);

    if (todoFiles.length === 0) {
      const message = options.global
        ? "No TODO files found in configuration. Run `tada-todo new` to create one first."
        : "No TODO file found in current directory. Run `tada-todo new` to create one first.";
      console.log(kleur.yellow(message));
      return;
    }

    let totalMovedTasks = 0;
    let updatedFileCount = 0;

    for (const todoFile of todoFiles) {
      const movedTasks = await moveUnresolvedTasks(todoFile, finalTargetDate);
      if (movedTasks > 0) {
        totalMovedTasks += movedTasks;
        updatedFileCount++;

        // Update the file in configuration if applicable
        await updateFileInConfig(todoFile, {
          config: options.config,
          type: options.type,
          silent: true,
        });
      }
    }

    if (totalMovedTasks > 0) {
      const fileMessage = options.global
        ? `${updatedFileCount} TODO file(s)`
        : "TODO file";
      console.log(
        kleur.green(
          `Moved ${totalMovedTasks} unresolved task(s) to "${finalTargetDate}" in ${fileMessage}.`,
        ),
      );
    } else {
      const message = options.global
        ? "No unresolved tasks found to move in any TODO files."
        : "No unresolved tasks found to move in TODO file.";
      console.log(kleur.blue(message));
    }
  } catch (error) {
    console.log(kleur.red(`Error: ${error}`));
  }
}

async function findTodoFiles(options: MoveTasksOptions): Promise<string[]> {
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

async function moveUnresolvedTasks(
  filePath: string,
  targetDate: string,
): Promise<number> {
  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  // Parse the file to find date sections and unresolved tasks
  const dateSections = parseFileIntoDateSections(lines);

  // Find unresolved tasks from all dates except the target date
  const tasksToMove: string[] = [];
  const sectionsToClean: string[] = [];

  for (const [date, section] of Object.entries(dateSections)) {
    if (date !== targetDate) {
      const unresolvedTasks = section.tasks.filter((task) =>
        task.trim().startsWith("- [ ]"),
      );

      if (unresolvedTasks.length > 0) {
        tasksToMove.push(...unresolvedTasks);
        sectionsToClean.push(date);
      }
    }
  }

  if (tasksToMove.length === 0) {
    return 0; // No tasks to move
  }

  // Ensure target date exists
  const targetDateExists = dateSections[targetDate] !== undefined;
  if (!targetDateExists) {
    console.log(
      kleur.blue(`Creating date heading "${targetDate}" in ${filePath}.`),
    );
    await addDateHeading(filePath, targetDate);

    // Re-read the file to get the updated content
    const updatedContent = readFileSync(filePath, "utf-8");
    const updatedLines = updatedContent.split("\n");

    // Update our working data
    lines.length = 0;
    lines.push(...updatedLines);
  }

  // Build new content by processing line by line
  const newLines: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line && line !== "") {
      // Handle undefined case
      break;
    }

    // Check if this is a date heading we need to clean
    if (line.startsWith("## ") && isDateHeading(line)) {
      const dateHeading = line.substring(3).trim();

      if (sectionsToClean.includes(dateHeading)) {
        // This is a date section we need to clean
        const sectionStartIndex = newLines.length;
        newLines.push(line); // Keep the heading
        i++;

        // Skip the blank line after heading if it exists
        if (i < lines.length) {
          const nextLine = lines[i];
          if (nextLine !== undefined && nextLine.trim() === "") {
            newLines.push(nextLine);
            i++;
          }
        }

        // Process tasks in this section
        let hasRemainingTasks = false;
        while (i < lines.length) {
          const currentLine = lines[i];
          if (!currentLine && currentLine !== "") {
            break;
          }

          if (
            currentLine.startsWith("## ") ||
            currentLine.trim().startsWith("---")
          ) {
            break;
          }

          // Keep resolved tasks and non-task lines
          if (!currentLine.trim().startsWith("- [ ]")) {
            newLines.push(currentLine);
            if (
              currentLine.trim().startsWith("- [x]") ||
              currentLine.trim().startsWith("- [X]")
            ) {
              hasRemainingTasks = true;
            }
          }
          i++;
        }

        // If no remaining tasks, remove the entire section
        if (!hasRemainingTasks) {
          // Remove all lines we added for this section
          newLines.splice(sectionStartIndex);

          // Remove any trailing blank lines before this section
          while (newLines.length > 0) {
            const lastLine = newLines[newLines.length - 1];
            if (lastLine !== undefined && lastLine.trim() === "") {
              newLines.pop();
            } else {
              break;
            }
          }

          // Add back one blank line for spacing if we have content
          if (newLines.length > 0) {
            newLines.push("");
          }
        }

        continue; // Don't increment i again
      }
    }

    // For target date section, add the moved tasks
    if (line.startsWith("## ") && isDateHeading(line)) {
      const dateHeading = line.substring(3).trim();

      if (dateHeading === targetDate) {
        newLines.push(line); // Add the heading
        i++;

        // Add blank line after heading if it exists
        if (i < lines.length) {
          const nextLine = lines[i];
          if (nextLine !== undefined && nextLine.trim() === "") {
            newLines.push(nextLine);
            i++;
          } else {
            newLines.push(""); // Ensure blank line exists
          }
        } else {
          newLines.push(""); // Ensure blank line exists
        }

        // Add all moved tasks at the beginning
        for (const task of tasksToMove) {
          newLines.push(task);
        }

        // Add existing tasks for this date
        while (i < lines.length) {
          const currentLine = lines[i];
          if (!currentLine && currentLine !== "") {
            break;
          }

          if (
            currentLine.startsWith("## ") ||
            currentLine.trim().startsWith("---")
          ) {
            break;
          }

          newLines.push(currentLine);
          i++;
        }

        continue; // Don't increment i again
      }
    }

    // Default: copy the line as-is
    newLines.push(line);
    i++;
  }

  // Write the updated content
  writeFileSync(filePath, newLines.join("\n"));

  return tasksToMove.length;
}

interface DateSection {
  startLine: number;
  endLine: number;
  tasks: string[];
}

function parseFileIntoDateSections(
  lines: string[],
): Record<string, DateSection> {
  const sections: Record<string, DateSection> = {};
  let currentDate: string | null = null;
  let currentSection: DateSection | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line && line !== "") {
      continue;
    }

    // Check for date heading
    if (line.startsWith("## ") && isDateHeading(line)) {
      // Save previous section if it exists
      if (currentDate && currentSection) {
        currentSection.endLine = i - 1;
        sections[currentDate] = currentSection;
      }

      // Start new section
      currentDate = line.substring(3).trim();
      currentSection = {
        startLine: i,
        endLine: lines.length - 1, // Will be updated when next section starts
        tasks: [],
      };
    } else if (
      currentSection &&
      (line.trim().startsWith("- [ ]") ||
        line.trim().startsWith("- [x]") ||
        line.trim().startsWith("- [X]"))
    ) {
      // Add task to current section
      currentSection.tasks.push(line);
    } else if (line.trim().startsWith("---")) {
      // End of content sections
      if (currentDate && currentSection) {
        currentSection.endLine = i - 1;
        sections[currentDate] = currentSection;
      }
      break;
    }
  }

  // Save the last section if it exists
  if (currentDate && currentSection) {
    sections[currentDate] = currentSection;
  }

  return sections;
}
