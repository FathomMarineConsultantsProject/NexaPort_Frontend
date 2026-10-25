import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getCatalogSupplier } from "../api/catalogApi";

export default function SupplierPublicProfile() {
  const { id } = useParams();
  const [supplier, setSupplier] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getCatalogSupplier(id)
      .then((data) => { if (active) setSupplier(data); })
      .catch((requestError) => { if (active) setError(requestError.response?.data?.message || "Supplier profile unavailable."); });
    return () => { active = false; };
  }, [id]);

  return <main className="md-detail-page">
    <Link className="md-back-link" to="/suppliers">Back to Products</Link>
    {error && <p role="alert">{error}</p>}
    {!error && !supplier && <p role="status">Loading supplier…</p>}
    {supplier && <article>
      <h1>{supplier.company_name}</h1>
      <p>NexaPort ID {supplier.nexaport_company_id}</p>
      <p>{[supplier.city, supplier.country].filter(Boolean).join(", ") || "Location not listed"}</p>
      {supplier.description && <p>{supplier.description}</p>}
      {supplier.website && <p><a href={supplier.website} target="_blank" rel="noreferrer">Company website</a></p>}
    </article>}
  </main>;
}
