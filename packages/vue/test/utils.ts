import { vi } from "bun:test";

export const handleSubmit = vi.fn((e) => {
  e.preventDefault();
  const form = e.target as HTMLFormElement;
  const data: Record<string, string> = {};
  for (const el of Array.from(form.querySelectorAll("input[name]"))) {
    const input = el as HTMLInputElement;
    data[input.name] = input.value;
  }
  return data;
});

export const sleep = (duration: number) => new Promise(resolve => setTimeout(resolve, duration));
