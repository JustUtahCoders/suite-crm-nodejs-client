import fs from "fs";
import { addAllClientCaseNotes } from "./internals/case-notes.js";

(async () => {
  const insertedClients = JSON.parse(
    fs.readFileSync("./artifacts/inserted-clients.json")
  );

  for (let contact of insertedClients) {
    await addAllClientCaseNotes(contact);
  }
})();
