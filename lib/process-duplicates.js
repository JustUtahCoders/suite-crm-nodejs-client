import fs from "fs";
import { numContactPages, callCUDatabaseApi } from "./internals/call-api.js";
import { insertClient } from "./internals/client-helpers.js";
import { addAllClientFilestoCUDatabase } from "./internals/file-helpers.js";

let readStdinResolve;

(async () => {
  const contacts = [];
  for (let i = 0; i < numContactPages; i++) {
    contacts.push(...readPage(i));
  }

  const duplicates = JSON.parse(
    fs.readFileSync("./artifacts/duplicates.json", "utf-8")
  );

  let numProcessed = 0;

  for (let contact of duplicates) {
    numProcessed++;
    if (contact.cuDatabaseId) {
      console.log(`Skipping ${contact.name}`);
      continue;
    }

    const suiteCrmContacts = findContactsByName(contacts, contact.name);
    if (suiteCrmContacts.length === 0) {
      throw Error(`Could not find suite crm id for ${name}`);
    }

    const suiteCrmContact = suiteCrmContacts[0];

    console.log(contact);

    let clientId;

    for (let duplicate of contact.cuDatabaseDuplicates) {
      const cuContact = await callCUDatabaseApi(`/api/clients/${duplicate.id}`);
      console.log("CU Client");
      console.log("----------------");
      console.log(cuContact);
      console.log("SuiteCRM Contact");
      console.log("----------------");
      console.log(suiteCrmContact.name_value_list.name);
      console.log(suiteCrmContact.name_value_list.birthdate);
      console.log(suiteCrmContact.name_value_list.phone_home);
      console.log(suiteCrmContact.name_value_list.phone_mobile);
      console.log(suiteCrmContact.name_value_list.phone_work);
      console.log(suiteCrmContact.name_value_list.phone_other);
      console.log(suiteCrmContact.name_value_list.phone_fax);
      console.log(suiteCrmContact.name_value_list.primary_address_street);
      console.log(suiteCrmContact.name_value_list.primary_address_city);
      console.log(suiteCrmContact.name_value_list.primary_address_state);
      console.log(suiteCrmContact.name_value_list.primary_address_postalcode);
      console.log(suiteCrmContact.name_value_list.date_entered);
      console.log(suiteCrmContact.id);
      console.log(`${numProcessed} / ${duplicates.length}`);
      console.log("Does the CU client match the SuiteCRM client?");
      const str = await readStdin();

      let useThisDuplicate = str.trim() === "y";

      if (useThisDuplicate) {
        clientId = duplicate.id;
        break;
      }
    }

    console.log(contact.name);
    if (!clientId) {
      console.log("No more duplicates to examine.");
      console.log("Proceed in creating a new CU client?");
      const str = await readStdin();
      if (str.trim() === "y") {
        console.log("--> Inserting client");
        clientId = await insertClient(suiteCrmContact);
      } else {
        console.log("SKIPPING", contact.name);
        continue;
      }
    }

    for (let suiteCrmContact of suiteCrmContacts) {
      suiteCrmContact.cuDatabaseId = clientId;
      suiteCrmContact.suiteCrmId = suiteCrmContact.id;

      console.log("--> Inserting client files");
      await addAllClientFilestoCUDatabase(suiteCrmContact);
    }

    contact.cuDatabaseId = clientId;

    fs.writeFileSync(
      "./artifacts/duplicates.json",
      JSON.stringify(duplicates, null, 2),
      "utf-8"
    );
  }

  process.exit(0);
})();

function findContactsByName(contacts, name) {
  return contacts.filter((c) => c.name_value_list.name.value === name);
}

function readPage(page) {
  return JSON.parse(
    fs.readFileSync(
      `./artifacts/contacts-${page * 20}-${page * 20 + 20}.json`,
      "utf-8"
    )
  );
}

process.stdin.on("readable", () => {
  let str = "";
  let chunk;
  // Use a loop to make sure we read all available data.
  while ((chunk = process.stdin.read()) !== null) {
    str += chunk;
  }

  if (typeof readStdinResolve === "function") {
    readStdinResolve(str);
  }
});

function readStdin() {
  return new Promise((resolve) => {
    readStdinResolve = resolve;
  });
}
