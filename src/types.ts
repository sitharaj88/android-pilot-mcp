export interface Environment {
  androidHome: string;
  adbPath: string;
  emulatorPath: string;
  avdmanagerPath: string;
  sdkmanagerPath: string;
  javaHome: string | undefined;
}

export interface ExecResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;
}

export interface ExecOptions {
  cwd?: string;
  timeout?: number;
  maxBuffer?: number;
  env?: Record<string, string>;
}
