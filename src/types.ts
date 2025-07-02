export interface TodoConfig {
  newFileName: string;
  humanReadable: boolean;
  saveInConfig: boolean;
  savedFiles?: SavedFile[];
}

export interface SavedFile {
  name: string;
  dirRelativeToConf: string;
  content: string;
  hash?: string;
}

export interface InitOptions {
  nonInteractive?: boolean;
  options?: string;
}

export interface CommandOptions {
  config?: string;
  type?: "json" | "msgpack" | "auto";
}

export interface AddTaskOptions extends CommandOptions {
  interactive?: boolean;
  noAutoCreateDate?: boolean;
}

export interface AddDateOptions extends CommandOptions {
  interactive?: boolean;
  global?: boolean;
}
