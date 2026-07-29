import { MapPin, Phone, Ruler } from "lucide-react";
import CopyableContact from "../common/CopyableContact";
import { getShipyardProfile, shipyardMapUrl } from "../../utils/shipyardProfile";

export default function ShipyardProfile({ entity }) {
  const profile = getShipyardProfile(entity);
  const hasAbout = profile.aboutSections.length > 0 || profile.description;
  const hasLocation = profile.address || profile.phone || profile.city || profile.country || profile.coordinates;

  return <>
    {hasAbout && <section className="maritime-detail__section shipyard-profile__about">
      <h2>About</h2>
      {profile.aboutSections.length
        ? <div className="shipyard-profile__prose">{profile.aboutSections.map((section, index) => <article key={`${section.heading || "about"}-${index}`}>{section.heading && <h3>{section.heading}</h3>}{section.body && section.body.split(/\n{2,}/).map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</article>)}</div>
        : <div className="shipyard-profile__prose"><p>{profile.description}</p></div>}
    </section>}
    {(profile.dimensions.length > 0 || hasLocation) && <div className="shipyard-profile__facts">
      {profile.dimensions.length > 0 && <section className="maritime-detail__section shipyard-profile__dimensions">
        <div className="shipyard-profile__section-title"><Ruler size={19} aria-hidden="true" /><h2>Shipyard Dimensions</h2></div>
        <dl>{profile.dimensions.map(({ label, value }) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      </section>}
      {hasLocation && <section className="maritime-detail__section shipyard-profile__location">
        <div className="shipyard-profile__section-title"><MapPin size={19} aria-hidden="true" /><h2>Contact and Location</h2></div>
        <div className="shipyard-profile__contact">
          {(profile.city || profile.country) && <p className="shipyard-profile__place">{[profile.city, profile.country].filter(Boolean).join(", ")}</p>}
          {profile.address && <address>{profile.address}</address>}
          {profile.phone && <p className="shipyard-profile__phone"><Phone size={16} aria-hidden="true" /><CopyableContact value={profile.phone} href={`tel:${profile.phone}`} type="phone" /></p>}
        </div>
        {profile.coordinates && <iframe title={`Map showing ${entity.company_name}`} loading="lazy" src={shipyardMapUrl(profile.coordinates)} />}
      </section>}
    </div>}
  </>;
}
