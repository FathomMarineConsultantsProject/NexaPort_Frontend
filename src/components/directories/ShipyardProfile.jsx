import { ExternalLink, Globe2, Mail, MapPin, Phone, Ruler } from "lucide-react";
import { directoryView, safeWebsite, validEmail } from "../../utils/directoryData";
import { CopyButton, DirectorySection } from "./DirectoryUI";

const mapUrl = ({ latitude, longitude }) => {
  const delta = 0.02;
  const bbox = [
    longitude - delta,
    latitude - delta,
    longitude + delta,
    latitude + delta,
  ].join(",");
  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(
    bbox
  )}&marker=${encodeURIComponent(`${latitude},${longitude}`)}`;
};

export default function ShipyardProfile({ view: suppliedView, entity }) {
  const view = suppliedView || directoryView({ entity }, "shipyard");
  const hasAbout = view.aboutSections.length > 0 || view.description;
  const hasContact = Boolean(
    view.city ||
      view.country ||
      view.address ||
      view.phone ||
      view.email ||
      view.website ||
      view.coordinates
  );
  const email = validEmail(view.email);
  const website = safeWebsite(view.website);
  const phoneTarget = view.phone?.replace(/[^\d+*#,;]/g, "") || "";
  const phoneHref =
    (phoneTarget.match(/\d/g) || []).length >= 3
      ? `tel:${phoneTarget}`
      : null;

  if (!hasAbout && view.dimensions.length === 0 && !hasContact) return null;

  return (
    <div className="shipyard-profile">
      {hasAbout && (
        <DirectorySection
          id="about"
          title="About"
          className="shipyard-profile__about"
        >
          {view.aboutSections.length ? (
            <div className="shipyard-profile__prose">
              {view.aboutSections.map((section, index) => (
                <article key={`${section.heading || "about"}-${index}`}>
                  {section.heading && <h3>{section.heading}</h3>}
                  {section.body
                    ?.split(/\n{2,}/)
                    .filter(Boolean)
                    .map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                </article>
              ))}
            </div>
          ) : (
            <div className="shipyard-profile__prose">
              <p>{view.description}</p>
            </div>
          )}
        </DirectorySection>
      )}

      {(view.dimensions.length > 0 || hasContact) && (
        <div className="shipyard-profile__facts">
          {view.dimensions.length > 0 && (
            <section id="dimensions" className="md-section shipyard-profile__dimensions">
              <div className="shipyard-profile__section-title">
                <Ruler size={19} aria-hidden="true" />
                <h2>Shipyard Dimensions</h2>
              </div>
              <dl>
                {view.dimensions.map(({ label, value }) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {hasContact && (
            <section id="contact" className="md-section shipyard-profile__location">
              <div className="shipyard-profile__section-title">
                <MapPin size={19} aria-hidden="true" />
                <h2>Contact and Location</h2>
              </div>
              <dl className="shipyard-profile__contact">
                {(view.city || view.country) && (
                  <div>
                    <dt>Location</dt>
                    <dd>{[view.city, view.country].filter(Boolean).join(", ")}</dd>
                  </div>
                )}
                {view.address && (
                  <div>
                    <dt>Address</dt>
                    <dd><address>{view.address}</address></dd>
                  </div>
                )}
                {view.phone && (
                  <div>
                    <dt><Phone size={15} aria-hidden="true" />Phone</dt>
                    <dd className="md-contact-value">
                      {phoneHref ? <a href={phoneHref}>{view.phone}</a> : view.phone}
                      {phoneHref && <CopyButton value={view.phone} label="Copy phone number" />}
                    </dd>
                  </div>
                )}
                {email && (
                  <div>
                    <dt><Mail size={15} aria-hidden="true" />Email</dt>
                    <dd className="md-contact-value"><a href={`mailto:${email}`}>{email}</a><CopyButton value={email} label="Copy email" /></dd>
                  </div>
                )}
                {website && (
                  <div>
                    <dt><Globe2 size={15} aria-hidden="true" />Website</dt>
                    <dd>
                      <a href={website} target="_blank" rel="noopener noreferrer">
                        Visit website <ExternalLink size={13} aria-hidden="true" />
                      </a>
                    </dd>
                  </div>
                )}
              </dl>
              {view.coordinates && (
                <iframe
                  title={`Map showing ${view.name}`}
                  loading="lazy"
                  src={mapUrl(view.coordinates)}
                />
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
