import { expect } from "bun:test";

export function nonNull<T>(value: T | null | undefined): T {
  expect(value).not.toBeNull();
  expect(value).not.toBeUndefined();

  return value as T;
}
