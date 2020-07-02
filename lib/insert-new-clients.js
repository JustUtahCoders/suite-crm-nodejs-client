import fs from "fs";
import { numContactPages, callCUDatabaseApi } from "./internals/call-api.js";
import { insertClient } from './internals/client-helpers.js'

(async () => {
  const duplicates = JSON.parse(
    fs.readFileSync("./artifacts/duplicates.json", "utf-8")
  );
  let insertedClients = [];
  if (fs.existsSync("./artifacts/inserted-clients.json")) {
    insertedClients = JSON.parse(
      fs.readFileSync("./artifacts/inserted-clients.json")
    );
  }

  for (let page = 0; page < numContactPages; page++) {
    console.log(`Page ${page}`);
    const contacts = JSON.parse(
      fs.readFileSync(
        `./artifacts/contacts-${page * 20}-${page * 20 + 20}.json`,
        "utf-8"
      )
    );
    for (let contact of contacts) {
      const name = contact.name_value_list.name.value.trim();
      if (duplicates.some(d => d.name === name)) {
        console.log("SKIPPING DUPLICATE", name);
      } else if (insertedClients.some(c => c.name === name)) {
        console.log("SKIPPING ALREADY INSERTED", name);
      } else {
        console.log("INSERTING", name);
        const cuDatabaseId = await insertClient(contact);
        insertedClients.push({name, cuDatabaseId, suiteCrmId: contact.id, page});
        fs.writeFileSync(
          "./artifacts/inserted-clients.json",
          JSON.stringify(insertedClients, null, 2),
          "utf-8"
        );
      }
    }
  }
})();