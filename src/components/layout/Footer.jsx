import { Anchor } from "lucide-react";
import "./Footer.css";

export default function Footer() {
  return (
    <footer className="np-footer">
      <div className="np-footer-left">
        <Anchor size={18} />
        <span>NexaPort Maritime Marketplace</span>
      </div>

      <div className="np-footer-right">
        © 2026 · Verified Maritime Experts. Anywhere. Anytime.
      </div>
    </footer>
  );
}