import NexaportBrand from "../branding/NexaportBrand";
import "./Footer.css";

export default function Footer() {
  return (
    <footer className="np-footer">
      <div className="np-footer-left">
        <NexaportBrand surface="dark" compact />
        <div className="np-footer-identity">
          <span className="np-footer-marketplace">Maritime Marketplace</span>
          <div className="np-footer-credit" aria-label="Powered by Bathyon FM. Deep intelligence. Limitless innovation.">
            <span className="np-footer-powered">Powered by</span>
            <span className="np-footer-bathyon" aria-hidden="true">BATHYON<sup>FM</sup></span>
            <span className="np-footer-tagline">Deep intelligence. Limitless innovation.</span>
          </div>
        </div>
      </div>

      <div className="np-footer-right">
        © 2026 · Verified Maritime Consultants. Anywhere. Anytime.
      </div>
    </footer>
  );
}
