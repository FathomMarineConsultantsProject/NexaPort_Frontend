import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { getCatalogImage, getCatalogProduct, searchCatalog } from '../../api/catalogApi';
import './ProductSearch.css';

const emptyPages = { page: 1, pages: 0, total: 0 };
const codeLabels = { IMPA: 'IMPA code', MODEL: 'Manufacturer model', PART: 'Part number', SKU: 'Supplier SKU' };
const codeLabel = namespace => codeLabels[String(namespace || '').toUpperCase()] || 'Product code';
const localDocument = url => typeof url === 'string' && url.startsWith('/') && !url.startsWith('//') && !url.includes('\\') && !/shipserv/i.test(url);
const companyWebsite = value => {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && !/(^|\.)shipserv\.com$/i.test(url.hostname) ? url.href : null;
  } catch { return null; }
};
const evidenceLabel = item => {
  if (item.type === 'verified_offer') return 'Reviewed verified offer';
  if (item.evidenceClassification === 'explicit_brochure_offer') return 'Brochure offer';
  if (item.evidenceClassification === 'reviewed_self_branded_offer') return 'Reviewed offer';
  if (item.evidenceClassification === 'supplier_catalogue_part') return 'Catalogue part';
  return 'Catalogue listing';
};

function EvidenceLinks({ relationships = [] }) {
  return relationships.filter(item => localDocument(item.evidenceUrl)).map((item, index) =>
    <a key={index} href={item.evidencePage ? `${item.evidenceUrl}#page=${item.evidencePage}` : item.evidenceUrl} target="_blank" rel="noreferrer">Open document{item.evidencePage ? ` · page ${item.evidencePage}` : ''} ↗</a>);
}

function SupplierRow({ supplier, matched = false, related = false }) {
  const name = matched ? supplier.canonical_company_name : supplier.name;
  const location = matched ? [supplier.canonical_city, supplier.canonical_country] : [supplier.location, supplier.country];
  const website = companyWebsite(supplier.website);
  const email = matched ? supplier.public_email : supplier.public_email || supplier.email;
  const phone = matched ? supplier.public_phone : supplier.public_phone || supplier.phone;
  const address = supplier.address || location.filter(Boolean).join(', ');
  return <details className="np-products__supplier"><summary><span className="np-products__supplier-main"><strong>{name}</strong><small>{location.filter(Boolean).join(', ') || 'Location not listed'}</small></span><span className="np-products__supplier-status">{related ? 'Related specification' : supplier.relationships?.map(evidenceLabel).join(' · ')}</span><span className="np-products__chevron" aria-hidden="true">⌄</span></summary>
    <div className="np-products__supplier-body"><div className="np-products__contact-grid">
      <div><small>Company</small><strong>{name}</strong></div>
      {matched && <div><small>NXP ID</small><span>{supplier.nexaport_company_id || supplier.public_id || 'Not listed'}</span></div>}
      <div><small>Phone</small>{phone ? <a href={`tel:${phone}`}>{phone}</a> : <span>Not listed</span>}</div>
      <div><small>Email</small>{email ? <a href={`mailto:${email}`}>{email}</a> : <span>Not listed</span>}</div>
      <div><small>Address / location</small><span>{address || 'Not listed'}</span></div>
      {website && <div><small>Website</small><a href={website} target="_blank" rel="noreferrer">Visit website ↗</a></div>}
    </div><div className="np-products__supplier-links">{matched && <Link to={`/supplier-profiles/${supplier.canonical_entity_id}`}>View NexaPort profile ↗</Link>}<EvidenceLinks relationships={supplier.relationships} /></div></div>
  </details>;
}

export default function ProductSearch() {
  const [query, setQuery] = useState('');
  const [matches, setMatches] = useState([]);
  const [searchPages, setSearchPages] = useState(emptyPages);
  const [relatedSources, setRelatedSources] = useState([]);
  const [relatedPages, setRelatedPages] = useState(emptyPages);
  const [searched, setSearched] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [selectedSummary, setSelectedSummary] = useState(null);
  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [imageUrl, setImageUrl] = useState(null);
  const searchRequest = useRef(0);
  const detailRequest = useRef(0);
  const detailRef = useRef(null);

  function closeDetail() {
    detailRequest.current += 1;
    setSelectedSummary(null);
    setSelected(null);
    setDetailError('');
    setDetailLoading(false);
  }

  useEffect(() => {
    if (!selectedSummary) return undefined;
    const onKeyDown = event => { if (event.key === 'Escape') closeDetail(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedSummary]);

  useEffect(() => {
    let active = true;
    let objectUrl;
    if (localDocument(selected?.image_url) && selected.image_url.startsWith('/catalog/images/')) {
      getCatalogImage(selected.image_url).then(blob => {
        objectUrl = URL.createObjectURL(blob);
        if (active) setImageUrl(objectUrl);
        else URL.revokeObjectURL(objectUrl);
      }).catch(() => { if (active) setImageUrl(null); });
    }
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [selected?.image_url]);

  async function search(event, page = 1) {
    event?.preventDefault();
    const request = ++searchRequest.current;
    setSearchLoading(true);
    setSearchError('');
    setSearched(true);
    try {
      const result = await searchCatalog(query, page);
      if (request !== searchRequest.current) return;
      setMatches(result.data || []);
      setSearchPages(result.pagination || emptyPages);
      setRelatedSources(result.relatedSources || []);
      setRelatedPages(result.relatedPagination || emptyPages);
      if (selectedSummary && !(result.data || []).some(item => item.id === selectedSummary.id)) closeDetail();
    } catch (error) {
      if (request === searchRequest.current) setSearchError(error.response?.data?.message || 'Product search unavailable.');
    } finally { if (request === searchRequest.current) setSearchLoading(false); }
  }

  async function open(product, page = 1) {
    const request = ++detailRequest.current;
    setSelectedSummary(product);
    setSelected(null);
    setImageUrl(null);
    setDetailError('');
    setDetailLoading(true);
    if (page === 1 && window.matchMedia('(max-width: 800px)').matches) window.requestAnimationFrame(() => detailRef.current?.focus());
    try {
      const result = await getCatalogProduct(product.id, page);
      if (request === detailRequest.current) setSelected(result);
    } catch (error) {
      if (request === detailRequest.current) setDetailError(error.response?.data?.message || 'Product details are unavailable.');
    } finally { if (request === detailRequest.current) setDetailLoading(false); }
  }

  const primary = selected?.identifiers?.[0];
  const code = primary?.display_value || selectedSummary?.identifiers?.[0];
  const supplierRows = selected ? [...new Map([...(selected.suppliers || []), ...(selected.sourceSuppliers || [])].map(supplier => [supplier.id, supplier])).values()] : [];
  return <section className="np-products" aria-label="Product catalogue">
    <form onSubmit={search} className="np-products__search"><label htmlFor="np-product-query">Search by product code, manufacturer model, part number, supplier SKU or name</label><div><input id="np-product-query" value={query} onChange={event => setQuery(event.target.value)} minLength={2} maxLength={120} placeholder="e.g. E350" required/><button type="submit" disabled={searchLoading}>Search products</button></div></form>
    {searchError && <div role="alert"><p>{searchError}</p><button type="button" onClick={() => search(null, searchPages.page)}>Retry</button></div>}
    <div className={`np-products__layout${selectedSummary ? ' np-products__layout--open' : ''}`}>
      <div className="np-products__results">
        {searchLoading && <p role="status" className="np-products__search-status">Updating results…</p>}
        {!searchLoading && matches.length === 0 && searched && !searchError && <p>No products found for this search.</p>}
        {matches.length > 0 && <div className="np-products__matches"><h2>Product matches <span>{searchPages.total}</span></h2>{matches.map(product => <button type="button" key={product.id} onClick={() => open(product)} aria-pressed={selectedSummary?.id === product.id}><strong>{product.name}</strong><span className="np-products__match-meta"><code>{product.identifiers?.[0] || 'Code not listed'}</code>{product.exact_match && <small>Exact identifier</small>}</span></button>)}</div>}
        {searchPages.pages > 1 && <nav className="np-products__pagination" aria-label="Product match pages"><button type="button" disabled={searchPages.page <= 1 || searchLoading} onClick={() => search(null, searchPages.page - 1)}>Previous matches</button><span>Page {searchPages.page} of {searchPages.pages}</span><button type="button" disabled={searchPages.page >= searchPages.pages || searchLoading} onClick={() => search(null, searchPages.page + 1)}>Next matches</button></nav>}
        {relatedSources.length > 0 && <section className="np-products__related" aria-label="Related source documents"><h2>Related product sources ({relatedPages.total})</h2><p>These documents contain the searched code. Product identity and supplier offering have not been verified.</p>{relatedSources.map(source => <div key={source.id}><strong>{source.supplier_name}</strong><span> · {codeLabel(source.namespace)} {source.display_identifier}</span><p>{localDocument(source.source_url) ? <a href={`${source.source_url}#page=${source.page_number}`} target="_blank" rel="noreferrer">Open document page {source.page_number} ↗</a> : 'Document not currently available in NexaPort'}</p></div>)}{relatedPages.pages > 1 && <nav aria-label="Related source pages"><button type="button" disabled={relatedPages.page <= 1 || searchLoading} onClick={() => search(null, relatedPages.page - 1)}>Previous sources</button><span>Page {relatedPages.page} of {relatedPages.pages}</span><button type="button" disabled={relatedPages.page >= relatedPages.pages || searchLoading} onClick={() => search(null, relatedPages.page + 1)}>Next sources</button></nav>}</section>}
      </div>
      {selectedSummary && <article className="np-products__detail" ref={detailRef} tabIndex={-1} aria-label="Product details"><header className="np-products__detail-header"><div><span className="np-products__eyebrow">Product details</span><h2>{selected?.name || selectedSummary.name}</h2>{code && <div className="np-products__code"><span>{codeLabel(primary?.namespace)}</span><strong>{code}</strong><button type="button" onClick={() => navigator.clipboard?.writeText(code)}>Copy code</button></div>}</div><button className="np-products__close" type="button" onClick={closeDetail}><span className="np-products__desktop-close">Close</span><span className="np-products__mobile-close">Back to results</span></button></header>
        {detailLoading && <div className="np-products__skeleton" role="status" aria-label="Loading product details"><span/><span/><span/><span/></div>}
        {detailError && <div role="alert" className="np-products__detail-error"><p>{detailError}</p><button type="button" onClick={() => open(selectedSummary)}>Retry</button></div>}
        {selected && <div className="np-products__detail-content"><div className="np-products__facts">{selected.manufacturer && <span><small>Manufacturer / brand</small><strong>{selected.manufacturer}</strong></span>}{selected.uom && <span><small>Unit</small><strong>{selected.uom}</strong></span>}{selected.categories?.length > 0 && <span><small>Category</small><strong>{selected.categories.map(category => category.name).join(' / ')}</strong></span>}</div>
          {imageUrl && <img className="np-products__image" src={imageUrl} alt={selected.name} onError={() => setImageUrl(null)}/>}
          {selected.description && <p className="np-products__description">{selected.description}</p>}
          {Object.keys(selected.specifications || {}).length > 0 && <section><h3>Specifications</h3><dl className="np-products__specifications">{Object.entries(selected.specifications).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{String(value)}</dd></div>)}</dl></section>}
          <section><div className="np-products__section-heading"><h3>Suppliers <span>{selected.sourceSupplierCount ?? supplierRows.length}</span></h3></div>{supplierRows.length === 0 && <p>No suppliers listed for this product.</p>}<div className="np-products__suppliers">{supplierRows.map(supplier => <SupplierRow key={supplier.id} supplier={supplier} matched={Boolean(supplier.canonical_entity_id)} />)}</div>{selected.pagination?.pages > 1 && <nav aria-label="Product supplier pages"><button type="button" disabled={selected.pagination.page <= 1 || detailLoading} onClick={() => open(selectedSummary, selected.pagination.page - 1)}>Previous</button><span>Page {selected.pagination.page} of {selected.pagination.pages}</span><button type="button" disabled={selected.pagination.page >= selected.pagination.pages || detailLoading} onClick={() => open(selectedSummary, selected.pagination.page + 1)}>Next</button></nav>}</section>
          {selected.relatedProductSources?.length > 0 && <section><div className="np-products__section-heading"><h3>Related product sources <span>{selected.relatedProductSources.length}</span></h3></div><div className="np-products__suppliers">{selected.relatedProductSources.map(supplier => <SupplierRow key={supplier.id} supplier={supplier} related />)}</div></section>}
        </div>}
      </article>}
    </div>
  </section>;
}
