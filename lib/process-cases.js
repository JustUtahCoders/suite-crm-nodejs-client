import fs from "fs";
import {
  callCUDatabaseApi,
  callSuiteCrmApi,
  numContactPages,
} from "./internals/call-api.js";
import dayjs from "dayjs";

let numProcessed = 0;
let maxToProcess = Infinity;

let insertedClients, duplicates;

(async () => {
  insertedClients = JSON.parse(
    fs.readFileSync("./artifacts/inserted-clients.json", "utf-8")
  );
  duplicates = JSON.parse(
    fs.readFileSync("./artifacts/duplicates.json", "utf-8")
  );

  for (let i = 0; i < numContactPages; i++) {
    await processCases(i);
  }
})();

async function processCases(page) {
  // console.log("processing cases for page", page);
  const contacts = JSON.parse(
    fs.readFileSync(
      `./artifacts/contacts-${page * 20}-${page * 20 + 20}.json`,
      "utf-8"
    )
  );
  for (let contact of contacts) {
    await processContactCases(contact, updateContact);

    function updateContact(cb) {
      cb(contact);
      fs.writeFileSync(
        `./artifacts/contacts-${page * 20}-${page * 20 + 20}.json`,
        JSON.stringify(contacts, null, 2),
        "utf-8"
      );
    }
  }
}

async function processContactCases(contact, updateContact) {
  const cases = contact.links.cases;

  if (cases.length === 0) {
    // console.log(contact.name_value_list.name.value, '- NO CASES')
  } else {
    console.log(contact.name_value_list.name.value);
    const insertedClient =
      insertedClients.find((c) => contact.id === c.suiteCrmId) ||
      duplicates.find(
        (d) =>
          d.name === contact.name_value_list.name.value.replace(/\s+/g, " ")
      );
    if (!insertedClient) {
      console.log(`--> Cannot find inserted client. Probably a duplicate?`);
      return;
    }
    const cuDatabaseId = insertedClient.cuDatabaseId;
    console.log(`--> CU Client ${cuDatabaseId}`);
    for (let kase of cases) {
      console.log(`--> Case ${kase.id}`);
      if (kase.insertedToCUDatabase) {
        console.log(`--> SKIPPING, already inserted`);
      } else {
        await processCase(kase.id, updateContact, cuDatabaseId);
      }
    }
  }
}

async function processCase(caseId, updateContact, cuDatabaseId) {
  if (numProcessed >= maxToProcess) {
    return;
  }
  const json = await callSuiteCrmApi("get_entries", {
    module: "Cases",
    ids: [caseId],
  });

  for (let i = 0; i < json.entry_list.length; i++) {
    const kase = json.entry_list[i];
    const cuDatabaseCaseNote = `(${
      kase.name_value_list.assigned_user_name.value
    } on ${dayjs(kase.name_value_list.date_entered.value).format(
      "YYYY-MM-DD"
    )}): ${kase.name_value_list.description.value}`;
    console.log(cuDatabaseCaseNote);

    console.log(`----> Inserting to CU database`);
    await callCUDatabaseApi(
      `/api/clients/${cuDatabaseId}/logs?tags=immigration`,
      {
        method: "POST",
        body: {
          title: kase.name_value_list.name.value,
          logType: "caseNote",
          description: cuDatabaseCaseNote,
        },
      }
    );
    console.log(`---> Success!!`);
    updateContact((contact) => {
      const caseRecord = contact.links.cases.find((k) => k.id === caseId);
      caseRecord.insertedToCUDatabase = true;
    });
  }
  numProcessed++;
}
