import { callCUDatabaseApi } from './call-api.js'
import { stateNameToAbbreviation } from './data-utils.js'
import dayjs from "dayjs";

export async function insertClient(contact) {
  const [firstName, ...otherNames] = getValue("name").split(/\s/)
  const lastName = otherNames.join(' ').trim() || '(Unknown)'

  const currentDay = new Date()
  let phone = getValue("phone_home") || getValue("phone_mobile") || getValue("phone_work") || getValue("phone_other") || getValue("phone_fax") || getValue("assistant_phone")
  phone = phone && phone.replace(/[\-a-zA-z\s]+/g, '').trim()
  const street = (getValue("primary_address_street") + getValue("primary_address_street_2", "") + getValue("primary_address_street_3", ""))
  const state = stateNameToAbbreviation[getValue("primary_address_state")] || null

  const newClient = {
    dateOfIntake: dayjs(getValue("date_entered", currentDay)).format("YYYY-MM-DD"),
    firstName,
    lastName,
    birthday: getValue("birthdate"),
    gender: "unknown",
    phone,
    homeAddress: {
      street: street === 0 ? null : street,
      city: getValue("primary_address_city"),
      state,
      zip: getValue("primary_address_postalcode")
    },
    currentlyEmployed: 'unknown'
  }

  const result = await callCUDatabaseApi(`/api/clients?strict=false`, {
    method: "POST",
    body: newClient,
  });

  return result.client.id

  function getValue(name, defaultVal = null) {
    return contact.name_value_list[name].value || defaultVal
  }
}