import { callCUDatabaseApi } from "./call-api.js";
import fs from "fs";

async function addClientFileToCUDatabase(contact, file) {
  const stats = fs.statSync(`./artifacts/files/${contact.suiteCrmId}/${file}`);
  let [_, fileName] = file.split("___");
  const fileExtension = file.slice(file.lastIndexOf(".") + 1);

  if (fileName.trim().length === 0) {
    fileName = "(Untitled)";
  }
  const body = {
    s3Key: `suite_crm/${contact.suiteCrmId}/${file}`,
    fileName,
    fileSize: stats.size,
    fileExtension,
  };

  console.log(`----> ${file}`);
  const result = await callCUDatabaseApi(
    `/api/clients/${contact.cuDatabaseId}/files?tags=immigration`,
    {
      method: "POST",
      body,
    }
  );

  return result.id;
}

export async function addAllClientFilestoCUDatabase(contact) {
  let files = [];

  try {
    const path = `./artifacts/files/${contact.suiteCrmId}`;
    files = fs.readdirSync(path);
  } catch (err) {}

  for (let file of files) {
    console.log(`--> ${contact.suiteCrmId}`);
    const cuFileId = await addClientFileToCUDatabase(contact, file);
  }

  console.log(`--> Done!`);
}
