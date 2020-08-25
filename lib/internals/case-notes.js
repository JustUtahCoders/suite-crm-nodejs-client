import fs from "fs";
import { callCUDatabaseApi } from "./call-api.js";

const suiteCrmContacts = {};
let insertedDescriptionNotes = {};

let err,
  page = 0;

while (!err) {
  try {
    const contactsPage = JSON.parse(
      fs.readFileSync(
        `./artifacts/contacts-${page * 20}-${(page + 1) * 20}.json`,
        "utf-8"
      )
    );
    for (let suiteCrmContact of contactsPage) {
      suiteCrmContacts[suiteCrmContact.id] = suiteCrmContact;
    }

    page++;
  } catch (error) {
    err = error;
  }
}

try {
  insertedDescriptionNotes = JSON.parse(
    fs.readFileSync("./artifacts/inserted-description-notes.json")
  );
} catch (err) {}

export async function addAllClientCaseNotes(contact) {
  const suiteCrmContact = suiteCrmContacts[contact.suiteCrmId];
  if (!suiteCrmContact) {
    throw Error(`Could not find suite crm contact ${contact.suiteCrmId}`);
  }

  console.log(`Contact: ${contact.cuDatabaseId} - ${contact.suiteCrmId}`);
  const note = suiteCrmContact.name_value_list.description.value.trim();
  if (note.length > 0) {
    const alreadyInserted = insertedDescriptionNotes[contact.suiteCrmId];
    if (alreadyInserted) {
      console.log(`----> Already inserted `);
    } else {
      console.log(`----> Inserting note`);
      await callCUDatabaseApi(
        `/api/clients/${2 || contact.cuDatabaseId}/logs?tags=immigration`,
        {
          method: "POST",
          body: {
            title: "Suite CRM Note",
            logType: "caseNote",
            description: note,
          },
        }
      );
      console.log(`----> Success!!`);
      insertedDescriptionNotes[contact.suiteCrmId] = true;
      fs.writeFileSync(
        `./artifacts/inserted-description-notes.json`,
        JSON.stringify(insertedDescriptionNotes, null, 2),
        "utf-8"
      );
    }
  } else {
    console.log("----> No note");
  }
}
