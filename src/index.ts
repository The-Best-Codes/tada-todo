#!/usr/bin/env node

import { Command } from "commander";
import { generateCommand } from "./commands/generate.js";
import { initCommand } from "./commands/init.js";
import { addDateCommand } from "./commands/manage/add-date.js";
import { addTaskCommand } from "./commands/manage/add-task.js";
import { newCommand } from "./commands/new.js";
import { pruneCommand } from "./commands/prune.js";
import { updateCommand } from "./commands/update.js";

const program = new Command();

program
  .name("tada-todo")
  .description("A simple CLI to manage tasks in a repo")
  .version("1.0.0");

program
  .command("init")
  .description("Initialize a new TODO configuration in the current directory")
  .option("--non-interactive", "Use defaults without prompting (for CI/CD)")
  .option(
    "--options <options>",
    "Comma-separated list of key=value pairs for configuration",
  )
  .action(initCommand);

program
  .command("new")
  .description("Create a new TODO file in the current directory")
  .option("--config <path>", "Path to the configuration file")
  .option("--type <type>", "Configuration file type (json|msgpack)", "auto")
  .action(newCommand);

program
  .command("generate")
  .description("Generate all TODO files from the configuration")
  .option("--config <path>", "Path to the configuration file")
  .option("--type <type>", "Configuration file type (json|msgpack)", "auto")
  .action(generateCommand);

program
  .command("update")
  .description("Update saved files in configuration from filesystem")
  .argument("[file]", "Specific file to update (optional)")
  .option("--config <path>", "Path to the configuration file")
  .option("--type <type>", "Configuration file type (json|msgpack)", "auto")
  .option("--scan", "Scan for TODO files not yet in configuration")
  .action(updateCommand);

program
  .command("prune")
  .description(
    "Remove saved files from configuration that no longer exist on filesystem",
  )
  .option("--config <path>", "Path to the configuration file")
  .option("--type <type>", "Configuration file type (json|msgpack)", "auto")
  .action(pruneCommand);

// Manage command group
const manageCommand = program
  .command("manage")
  .description("Manage TODO files and tasks");

manageCommand
  .command("add-date [date]")
  .description(
    "Add a new date heading to TODO files (defaults to current date)",
  )
  .option("--config <path>", "Path to the configuration file")
  .option("--type <type>", "Configuration file type (json|msgpack)", "auto")
  .action(addDateCommand);

manageCommand
  .command("add-task <task> [date]")
  .description("Add a new task to a specific date (defaults to current date)")
  .option("--config <path>", "Path to the configuration file")
  .option("--type <type>", "Configuration file type (json|msgpack)", "auto")
  .action(addTaskCommand);

program.parse();
