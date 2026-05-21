import { stubGroup } from "./_stub.js";

export const keyCommand = stubGroup("key", "Team API key management.", [
  ["create", "Create an API key."],
  ["get", "Retrieve an API key by ID."],
  ["list", "List API keys."],
  ["update", "Update an API key."],
  ["delete", "Delete an API key."],
  ["usage", "Retrieve usage analytics for an API key."],
]);
