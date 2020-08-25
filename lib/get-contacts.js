import { callSuiteCrmApi } from "./internals/call-api.js";
import fs from "fs";

(async () => {
  for (let i = 0; i < numContactPages; i++) {
    await getPage(i);
  }
})();

async function getPage(page) {
  console.log("getting page ", page);
  const json = await callSuiteCrmApi("get_entry_list", {
    module: "Contacts",
    offset: 1,
    Contacts2_CONTACT_offset: 0,
    max_results: page * 20,
  });

  const contacts = json.entry_list;

  fs.writeFileSync(
    `./artifacts/contacts-${page * 20}-${page * 20 + 20}.json`,
    JSON.stringify(contacts, null, 2),
    "utf-8"
  );
}
