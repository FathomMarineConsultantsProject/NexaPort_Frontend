import assert from "node:assert/strict";
import test, { after, before } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import { getShipyardProfile, isShipyardDirectory } from "../src/utils/shipyardProfile.js";

let server;
let ShipyardProfile;

before(async () => {
  server = await createServer({ appType: "custom", server: { middlewareMode: true } });
  ShipyardProfile = (await server.ssrLoadModule("/src/components/directories/ShipyardProfile.jsx")).default;
});

after(async () => server.close());

const entity = {
  company_name: "Ada Shipyard",
  description: "Fallback description",
  extra_data: {
    shipyard: {
      about_sections: [{ heading: "Introduction", body: "Visible About text." }],
      dimensions: { max_length_m: 90, max_width_m: 15, max_draft_m: 4 },
      location: { public_address: "Location address", public_phone: "+90 111", city: "Tuzla", country: "Türkiye" },
    },
  },
};

const render = (value) => renderToStaticMarkup(ShipyardProfile({ entity: value }));

test("Shipyard renders structured About and every available dimension", () => {
  const html = render(entity);
  assert.match(html, /Introduction/);
  assert.match(html, /Visible About text/);
  assert.match(html, /Max Length/);
  assert.match(html, /90 m/);
  assert.match(html, /Max Width/);
  assert.match(html, /15 m/);
  assert.match(html, /Max Draft/);
  assert.match(html, /4 m/);
});

test("Shipyard hides missing dimensions and uses description fallback", () => {
  const html = render({ description: "Only the fallback.", extra_data: { shipyard: { dimensions: { max_length_m: 90 } } } });
  assert.match(html, /Only the fallback/);
  assert.match(html, /Max Length/);
  assert.doesNotMatch(html, /Max Width|Max Draft|null|undefined|>0 m</);
});

test("Shipyard renders contact fallbacks and a map only with usable coordinates", () => {
  const fallback = getShipyardProfile({
    public_address: "Entity address",
    public_phone: "+90 222",
    city: "Istanbul",
    country: "Türkiye",
    extraData: { shipyard: { location: { public_address: "Ignored address", latitude: 40.8, longitude: 29.3 } } },
  });
  assert.equal(fallback.address, "Entity address");
  assert.equal(fallback.phone, "+90 222");
  assert.equal(fallback.city, "Istanbul");
  assert.equal(fallback.country, "Türkiye");
  assert.ok(fallback.coordinates);
  assert.match(render({ ...entity, extra_data: { ...entity.extra_data, shipyard: { ...entity.extra_data.shipyard, location: { ...entity.extra_data.shipyard.location, latitude: 40.8, longitude: 29.3 } } } }), /<iframe/);
  assert.doesNotMatch(render({ ...entity, extra_data: { shipyard: { ...entity.extra_data.shipyard, location: { ...entity.extra_data.shipyard.location, latitude: null, longitude: null } } } }), /<iframe/);
});

test("Shipyard presentation omits every generic provider section", () => {
  const html = render(entity);
  for (const title of ["FAQs", "Products", "Ports Covered", "Branches", "Offices", "Memberships", "Certifications", "Class Approvals", "Tickets", "Reviews", "Q&A", "Services"]) {
    assert.doesNotMatch(html, new RegExp(title));
  }
});

test("Supplier and Ship Agent directory types remain on the generic path", () => {
  assert.equal(isShipyardDirectory("supplier"), false);
  assert.equal(isShipyardDirectory("ship_agent"), false);
  assert.equal(isShipyardDirectory("shipyard"), true);
});

test("null and malformed extra_data do not crash", () => {
  assert.doesNotThrow(() => render({ company_name: "Empty", extra_data: null }));
  assert.doesNotThrow(() => render({ company_name: "Malformed", extra_data: "not-json" }));
  assert.equal(render({ company_name: "Empty", extra_data: null }), "");
});
