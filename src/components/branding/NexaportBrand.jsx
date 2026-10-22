import { Link } from "react-router-dom";
import "./NexaportBrand.css";

export default function NexaportBrand({ to="/", className="", surface="light", compact=false, symbolOnly=false }) {
  return <Link to={to} className={`nexaport-brand nexaport-brand--${surface}${compact?" nexaport-brand--compact":""} ${className}`.trim()} aria-label="Nexæport home">
    <img className="nexaport-brand__symbol" src="/brand/nexaport-symbol.png" alt="" aria-hidden="true" />
    {!symbolOnly && <img className="nexaport-brand__wordmark" src="/brand/nexaport-wordmark.png" alt="" aria-hidden="true" />}
  </Link>;
}
