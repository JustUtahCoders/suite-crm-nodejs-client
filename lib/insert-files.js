import fs from "fs";
import { addAllClientFilestoCUDatabase } from './internals/file-helpers.js'

(async () => {
  const insertedClients = JSON.parse(
    fs.readFileSync("./artifacts/inserted-clients.json")
  );

  for (let contact of insertedClients) {
    console.log(contact.name)
    addAllClientFilestoCUDatabase(contact)
  }
})();