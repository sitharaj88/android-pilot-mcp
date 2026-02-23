import { resolve, isAbsolute } from "node:path";

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export function validateAbsolutePath(inputPath: string, label: string = "Path"): string {
  if (!inputPath || typeof inputPath !== "string") {
    throw new ValidationError(`${label} must be a non-empty string.`);
  }

  if (!isAbsolute(inputPath)) {
    throw new ValidationError(`${label} must be an absolute path. Got: ${inputPath}`);
  }

  if (inputPath.includes("\0")) {
    throw new ValidationError(`${label} contains invalid characters.`);
  }

  return resolve(inputPath);
}

const PACKAGE_NAME_RE = /^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$/;

export function validatePackageName(name: string): string {
  if (!PACKAGE_NAME_RE.test(name)) {
    throw new ValidationError(
      `Invalid Android package name: "${name}". ` +
        `Expected format: com.example.myapp (2+ dot-separated segments, ` +
        `each starting with a letter, containing letters/digits/underscores).`,
    );
  }
  if (name.length > 255) {
    throw new ValidationError(`Package name is too long (${name.length} chars, max 255).`);
  }
  return name;
}

const SAFE_NAME_RE = /^[a-zA-Z][a-zA-Z0-9_-]*$/;

export function validateSafeName(name: string, label: string = "Name"): string {
  if (!name || name.length > 128) {
    throw new ValidationError(`${label} must be 1-128 characters.`);
  }
  if (!SAFE_NAME_RE.test(name)) {
    throw new ValidationError(
      `${label} contains invalid characters: "${name}". ` +
        `Only letters, digits, underscores, and hyphens are allowed.`,
    );
  }
  return name;
}

const SDK_PACKAGE_RE = /^[a-zA-Z0-9_.;-]+$/;

export function validateSdkPackage(pkg: string): string {
  if (!pkg || !SDK_PACKAGE_RE.test(pkg)) {
    throw new ValidationError(
      `Invalid SDK package name: "${pkg}". ` +
        `Only alphanumeric, dots, underscores, hyphens, and semicolons are allowed.`,
    );
  }
  return pkg;
}

export const DEVICE_SHELL_MAX_LENGTH = 4096;

export function validateShellCommand(command: string): string {
  if (!command || command.length > DEVICE_SHELL_MAX_LENGTH) {
    throw new ValidationError(`Shell command must be 1-${DEVICE_SHELL_MAX_LENGTH} characters.`);
  }
  if (command.includes("\0")) {
    throw new ValidationError("Shell command contains invalid null bytes.");
  }
  return command;
}
