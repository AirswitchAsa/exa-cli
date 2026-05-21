import { stubGroup } from "./_stub.js";

export const monitorCommand = stubGroup("monitor", "Recurring scheduled Exa searches.", [
  ["create", "Create a monitor."],
  ["get", "Retrieve a monitor by ID."],
  ["list", "List monitors."],
  ["update", "Update a monitor."],
  ["delete", "Delete a monitor."],
  ["trigger", "Trigger a monitor run immediately."],
  ["runs", "List or retrieve monitor runs."],
]);
