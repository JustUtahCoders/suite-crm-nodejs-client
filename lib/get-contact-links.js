import { getSession, numContactPages } from "./internals/call-api.js";
import fetch from "node-fetch";
import jsdom from "jsdom";
import fs from "fs";

(async () => {
  for (let page = 0; page < numContactPages; page++) {
    console.log(`Page ${page}`);
    const contacts = JSON.parse(
      fs.readFileSync(
        `./artifacts/contacts-${page * 20}-${page * 20 + 20}.json`,
        "utf-8"
      )
    );
    for (let contact of contacts) {
      contact.links = await getLinks(contact);
    }
    fs.writeFileSync(
      `./artifacts/contacts-${page * 20}-${page * 20 + 20}.json`,
      JSON.stringify(contacts, null, 2),
      "utf-8"
    );
  }
})();

async function getLinks(contact) {
  console.log(contact.name_value_list.name.value);
  const session = await getSession();

  const response = await fetch(
    `${process.env.SCRM_BASE_URL}/index.php?module=Contacts&offset=15&stamp=1593470833071698600&return_module=Contacts&action=DetailView&record=${contact.id}&ajax_load=1&loadLanguageJS=1`,
    {
      headers: {
        Cookie: `sugar_user_theme=Suite7; PHPSESSID=${session}`,
      },
    }
  );
  if (!response.ok) {
    throw Error(
      `Could not fetch contact relationship json. Response status ${
        response.status
      } ${response.statusText}, content-type ${response.headers.get(
        "content-type"
      )}`
    );
  }

  const json = await response.json();

  const dom = new jsdom.JSDOM(json.content);

  const documents = [],
    invoices = [],
    cases = [];

  dom.window.document
    .querySelectorAll("#subpanel_documents tr")
    .forEach((tr, i) => {
      const downloadAnchor = tr.querySelector("td a");
      if (downloadAnchor) {
        const downloadUrl = downloadAnchor.getAttribute("href");
        const filename = tr
          .querySelector("td:nth-child(3) a")
          .textContent.trim();
        const id = new URLSearchParams(
          downloadUrl.slice(downloadUrl.indexOf("?"))
        ).get("id");
        documents.push({ downloadUrl, filename, id });
      }
    });

  dom.window.document
    .querySelectorAll("#subpanel_contact_aos_invoices tr")
    .forEach((tr, i) => {
      const viewInvoiceAnchor = tr.querySelector("td:nth-child(2) a");
      if (viewInvoiceAnchor) {
        const url = viewInvoiceAnchor.getAttribute("href");
        const action = new URLSearchParams(url.slice(url.indexOf("?"))).get(
          "action"
        );
        const id = new URLSearchParams(action).get("record");
        invoices.push({ id });
      }
    });

  dom.window.document
    .querySelectorAll("#list_subpanel_cases tr")
    .forEach((tr, i) => {
      const viewCaseAnchor = tr.querySelector("td:nth-child(2) a");
      if (viewCaseAnchor) {
        const url = viewCaseAnchor.getAttribute("href");
        const action = new URLSearchParams(url.slice(url.indexOf("?"))).get(
          "action"
        );
        const id = new URLSearchParams(action).get("record");
        cases.push({ id });
      }
    });

  console.log(cases);

  return { documents, invoices, cases };
}
