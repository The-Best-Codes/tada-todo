import { decode, encode } from "@msgpack/msgpack";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { dirname, join, resolve } from "path";
import type { TodoConfig } from "../types.js";

export function findConfigFile(
  startDir: string = process.cwd(),
): { path: string; type: "json" | "msgpack" } | null {
  let currentDir = resolve(startDir);
  const maxDepth = 10; // Prevent infinite loops
  let depth = 0;

  while (depth < maxDepth) {
    // Check for msgpack config first
    const msgpackPath = join(currentDir, "tada-todo.b");
    if (existsSync(msgpackPath)) {
      return { path: msgpackPath, type: "msgpack" };
    }

    // Check for JSON config
    const jsonPath = join(currentDir, "tada-todo.json");
    if (existsSync(jsonPath)) {
      return { path: jsonPath, type: "json" };
    }

    // Move up one directory
    const parentDir = dirname(currentDir);
    if (parentDir === currentDir) {
      // Reached root directory
      break;
    }
    currentDir = parentDir;
    depth++;
  }

  return null;
}

export function loadConfig(
  configPath: string,
  type?: "json" | "msgpack" | "auto",
): TodoConfig {
  if (!existsSync(configPath)) {
    throw new Error(`Configuration file not found: ${configPath}`);
  }

  const detectedType =
    type === "auto" || !type
      ? configPath.endsWith(".json")
        ? "json"
        : "msgpack"
      : type;

  try {
    const fileContent = readFileSync(configPath);

    if (detectedType === "json") {
      return JSON.parse(fileContent.toString());
    } else {
      return decode(fileContent) as TodoConfig;
    }
  } catch (error) {
    throw new Error(`Failed to parse configuration file: ${error}`);
  }
}

export function saveConfig(
  config: TodoConfig,
  configPath: string,
  type: "json" | "msgpack",
): void {
  try {
    if (type === "json") {
      writeFileSync(configPath, JSON.stringify(config, null, 2));
    } else {
      writeFileSync(configPath, encode(config));
    }
  } catch (error) {
    throw new Error(`Failed to save configuration file: ${error}`);
  }
}

export function getConfigPath(humanReadable: boolean): string {
  return humanReadable ? "tada-todo.json" : "tada-todo.b";
}
