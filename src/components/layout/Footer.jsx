import NexaportBrand from "../branding/NexaportBrand";
import "./Footer.css";

export default function Footer() {
  return (
    <footer className="np-footer">
      <div className="np-footer-left">
        <NexaportBrand surface="dark" compact />
        <span>Maritime Marketplace<small>Powered by Fathom Tech</small></span>
      </div>

      <div className="np-footer-right">
        © 2026 · Verified Maritime Consultants. Anywhere. Anytime.
      </div>
    </footer>
  );
}
