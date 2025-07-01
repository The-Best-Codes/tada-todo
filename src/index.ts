#!/usr/bin/env node

import { Command } from "commander";
import { generateCommand } from "./commands/generate.js";
import { initCommand } from "./commands/init.js";
import { newCommand } from "./commands/new.js";

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

program.parse();
