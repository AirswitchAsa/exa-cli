export function resolveApiKey(override?: string): string {
  const key = override ?? process.env.EXA_API_KEY;
  if (key === undefined || key.length === 0) {
    throw new Error("No Exa API key found. Set EXA_API_KEY or pass --api-key <key>.");
  }
  return key;
}
