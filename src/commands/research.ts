import { stubGroup } from "./_stub.js";

export const researchCommand = stubGroup("research", "Asynchronous deep-research tasks.", [
  ["create", "Create a research task."],
  ["get", "Retrieve a research task by ID."],
  ["list", "List research tasks."],
]);
