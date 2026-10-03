import { CliError } from './errors';

export type Json =
  string | number | boolean | null | Json[] | { [key: string]: Json };
export type JsonObject = Record<string, Json>;

export function isJson(value: unknown): value is Json {
  if (value === null || typeof value === 'string' || typeof value === 'boolean')
    return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value)) return value.every((item: unknown) => isJson(item));
  return (
    typeof value === 'object' &&
    Object.values(value).every((item: unknown) => isJson(item))
  );
}

/** 解析服务端响应；失败时不回显内容，响应里可能带凭据 */
export function parseJson(text: string): Json {
  try {
    const value: unknown = JSON.parse(text);
    if (isJson(value)) return value;
  } catch {
    /* fall through */
  }
  throw new CliError(
    'invalid_response',
    'Expected a JSON response from Koiro.',
    8,
  );
}

export function object(value: Json | undefined): JsonObject {
  if (
    value === undefined ||
    value === null ||
    Array.isArray(value) ||
    typeof value !== 'object'
  ) {
    throw new CliError(
      'invalid_response',
      'Expected a JSON object from Koiro.',
      8,
    );
  }
  return value;
}

export function array(value: Json | undefined): Json[] {
  if (!Array.isArray(value))
    throw new CliError(
      'invalid_response',
      'Expected a JSON array from Koiro.',
      8,
    );
  return value;
}

export function string(value: Json | undefined): string {
  if (typeof value !== 'string')
    throw new CliError(
      'invalid_response',
      'Missing or invalid response field.',
      8,
    );
  return value;
}

export function number(value: Json | undefined): number {
  if (typeof value !== 'number')
    throw new CliError(
      'invalid_response',
      'Missing or invalid response field.',
      8,
    );
  return value;
}
