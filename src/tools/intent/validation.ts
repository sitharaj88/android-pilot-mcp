import { ValidationError } from "../../utils/validation.js";

const MAX_TOKEN_LENGTH = 256;
const MAX_URI_LENGTH = 2048;

const ACTION_RE = /^[A-Za-z0-9._-]+$/;
const COMPONENT_RE = /^[A-Za-z0-9._$]+\/[A-Za-z0-9._$]+$/;
const EXTRA_KEY_RE = /^[A-Za-z0-9._]+$/;
const FLAG_RE = /^(0x[0-9A-Fa-f]+|-?\d+)$/;
// NUL and other C0 control characters (plus DEL) are rejected outright; everything else
// (spaces, &, (), quotes, $, etc.) is legitimate in URLs/extras and is neutralized by
// quoting the value for the device shell via shellQuoteForDevice() instead of being banned here.
function hasControlChars(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code <= 0x1f || code === 0x7f) return true;
  }
  return false;
}

/**
 * Single-quotes a value so it survives as one word when re-parsed by the device's shell
 * (adb joins "adb shell <args...>" into a single command line that the on-device shell parses).
 */
export function shellQuoteForDevice(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function assertLength(value: string, label: string, max: number): void {
  if (!value || value.length > max) {
    throw new ValidationError(`${label} must be 1-${max} characters.`);
  }
}

export function validateIntentAction(action: string, label: string = "Action"): string {
  assertLength(action, label, MAX_TOKEN_LENGTH);
  if (!ACTION_RE.test(action)) {
    throw new ValidationError(
      `Invalid ${label.toLowerCase()}: "${action}". Only letters, digits, dots, hyphens, and underscores are allowed.`,
    );
  }
  return action;
}

export function validateComponent(component: string): string {
  assertLength(component, "Component", MAX_TOKEN_LENGTH);
  if (!COMPONENT_RE.test(component)) {
    throw new ValidationError(
      `Invalid component: "${component}". Expected format: package/class ` +
        `(letters, digits, dots, underscores, and "$" on each side of a single "/").`,
    );
  }
  return component;
}

export function validateExtras(extras: Record<string, string>): Record<string, string> {
  for (const [key, value] of Object.entries(extras)) {
    assertLength(key, "Extra key", MAX_TOKEN_LENGTH);
    if (!EXTRA_KEY_RE.test(key)) {
      throw new ValidationError(
        `Invalid extra key: "${key}". Only letters, digits, dots, and underscores are allowed.`,
      );
    }
    assertLength(value, `Extra value for "${key}"`, MAX_TOKEN_LENGTH);
    if (hasControlChars(value)) {
      throw new ValidationError(
        `Extra value for "${key}" contains control characters, which are not allowed.`,
      );
    }
  }
  return extras;
}

export function validateFlag(flag: string): string {
  assertLength(flag, "Intent flag", 32);
  if (!FLAG_RE.test(flag)) {
    throw new ValidationError(
      `Invalid intent flag: "${flag}". Expected a hex value (e.g. "0x10000000") or a decimal integer.`,
    );
  }
  return flag;
}

export function validateDeeplinkUri(uri: string): string {
  assertLength(uri, "URI", MAX_URI_LENGTH);
  if (hasControlChars(uri)) {
    throw new ValidationError(
      `Invalid URI: "${uri}" contains control characters, which are not allowed.`,
    );
  }
  return uri;
}
