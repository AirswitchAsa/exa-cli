import { stubGroup } from "./_stub.js";

export const agentCommand = stubGroup("agent", "Multi-step research agent runs.", [
  ["create", "Create an agent run."],
  ["get", "Retrieve an agent run by ID."],
  ["list", "List agent runs."],
  ["cancel", "Cancel a queued or running agent run."],
  ["delete", "Delete a stored agent run."],
  ["events", "List or replay agent run events."],
]);
