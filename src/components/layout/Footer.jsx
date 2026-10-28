import NexaportBrand from "../branding/NexaportBrand";
import "./Footer.css";

export default function Footer() {
  return (
    <footer className="np-footer">
      <div className="np-footer-main">
        <div className="np-footer-product">
          <NexaportBrand surface="dark" />
          <span>Maritime Marketplace</span>
        </div>
        <div className="np-footer-parent">
          <span className="np-footer-powered">Powered by</span>
          <strong>BATHYON FM</strong>
          <span className="np-footer-tagline">Deep Intelligence. Limitless Innovation.</span>
        </div>
      </div>
      <div className="np-footer-bottom">
        <span>Nexæport · Maritime Marketplace</span>
        <span>© {new Date().getFullYear()} · Verified Maritime Consultants. Anywhere. Anytime.</span>
      </div>
    </footer>
  );
}
