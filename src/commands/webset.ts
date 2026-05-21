import { stubGroup } from "./_stub.js";

export const websetCommand = stubGroup("webset", "Websets — curated, enriched collections.", [
  ["create", "Create a webset."],
  ["get", "Retrieve a webset by ID."],
  ["list", "List websets."],
  ["update", "Update a webset."],
  ["delete", "Delete a webset."],
  ["cancel", "Cancel running webset operations."],
  ["preview", "Preview search decomposition."],
  ["search", "Create a search within a webset."],
  ["items", "List webset items."],
  ["enrich", "Create an enrichment field."],
  ["export", "Schedule a data export."],
  ["import", "Create an import for data upload."],
]);
