import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("all three existing Client verification documents are visibly optional and never frontend-required", async () => {
  const page = await source("../src/pages/RegisterClient.jsx");
  for (const category of ["company_registration_certificate", "authorisation_letter", "company_identification_or_tax_certificate"]) assert.match(page, new RegExp(category));
  assert.match(page, /Optional\. PDF, PNG, JPEG or WEBP/);
  assert.doesNotMatch(page, /documents[^\n]*(required|length\s*[!=]==?\s*3)/i);
});

test("only successful uploads enter documentTokens; failed optional uploads support retry and removal", async () => {
  const page = await source("../src/pages/RegisterClient.jsx");
  assert.match(page, /document\.token \? \[document\.token\] : \[\]/);
  assert.match(page, /status: "Upload failed"/);
  assert.match(page, /failed \? "Retry"/);
  assert.match(page, />Remove</);
  assert.match(page, /delete nextDocuments\[category\]/);
});

test("upload and registration surface safe specific errors instead of generic failure", async () => {
  const [page, api] = await Promise.all([source("../src/pages/RegisterClient.jsx"), source("../src/api/clientRegistrationApi.js")]);
  assert.match(page, /error\.response\?\.data\?\.message \|\| error\.message/);
  assert.match(page, /requestError\.response\?\.data\?\.message \|\| requestError\.message/);
  assert.match(api, /Private document upload failed \(HTTP/);
  assert.match(api, /storage could not be reached/);
});

test("registration draft identity does not replace an existing account login token", async () => {
  const api = await source("../src/api/clientRegistrationApi.js");
  assert.match(api, /"x-registration-draft-token": registrationDraftToken/);
  assert.doesNotMatch(api, /Authorization: `Bearer \$\{registrationDraftToken\}`/);
});
