import { Anchor, ArrowRight, ChevronDown, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getPlatformStats } from "../api/publicStatsApi";
import { getServiceRequestDropdowns } from "../api/masterApi";
import { landingMetrics, metricText } from "./landingData";
import "./Landing.css";

const journey = [
  ["Describe the inspection", "Specify vessel details, port, date, inspection type and scope of work."],
  ["Review the offer", "Consultant quotations are reviewed and prepared into a client-facing commercial proposal."],
  ["Coordinate the survey", "Manage preparation, inspection checklists, field records and supporting evidence."],
  ["Receive the report", "Follow technical review, report confirmation and inspection closeout."],
];

const previews = [
  { label: "Requests", eyebrow: "Service request management", title: "A clear brief from the outset", status: "Submitted for review", fields: [["Vessel", "MV Example"], ["Port", "Port of inspection"], ["Inspection", "Scope of work"], ["Next step", "Administrative review"]], note: "Record vessel, port, timing and scope in one request." },
  { label: "Quotations", eyebrow: "Consultant quotation review", title: "Review before committing", status: "Under review", fields: [["Request", "MV Example"], ["Consultant", "Eligible specialist"], ["Submission", "Quotation received"], ["Next step", "Commercial assessment"]], note: "Compare eligible quotations and record the decision." },
  { label: "Proposals", eyebrow: "Commercial proposals", title: "A client-facing offer", status: "Awaiting client", fields: [["Request", "MV Example"], ["Basis", "Reviewed quotation"], ["Document", "Commercial proposal"], ["Next step", "Client decision"]], note: "Present the approved commercial terms for the client's decision." },
  { label: "Workflow", eyebrow: "Inspection coordination", title: "Every stage in sequence", status: "In preparation", fields: [["Vessel", "MV Example"], ["Current stage", "Preparation"], ["Surveyor", "Assignment recorded"], ["Next step", "Inspection checklist"]], note: "Track preparation, assignment and inspection progress." },
  { label: "Checklists", eyebrow: "Digital inspection records", title: "Evidence alongside observations", status: "In progress", fields: [["Vessel", "MV Example"], ["Record", "Inspection checklist"], ["Evidence", "Supporting files"], ["Next step", "Technical review"]], note: "Keep structured findings and evidence with the inspection." },
  { label: "Reports", eyebrow: "Report management", title: "A traceable closeout", status: "In review", fields: [["Vessel", "MV Example"], ["Document", "Inspection report"], ["Review", "Technical confirmation"], ["Next step", "Closeout"]], note: "Follow review, confirmation and final delivery." },
];

const directoryNames = ["Global ports", "Vessel directory", "Owners and managers", "Marine surveyors", "Accredited inspectors", "Flag State inspectors", "Ship agents", "Service providers", "Marine suppliers", "Shipyards", "Tug boats"];
const capabilities = [
  ["Commercial review", "Consultant quotation assessment and client-facing proposals."],
  ["Digital inspection records", "Structured checklists, observations and supporting evidence."],
  ["Reporting and closeout", "Daily activity records, report review, approvals and financial closeout."],
];

export default function Landing() {
  const isLoggedIn = Boolean(localStorage.getItem("np_token"));
  const [stats, setStats] = useState(null);
  const [verticals, setVerticals] = useState(null);
  const [catalogueError, setCatalogueError] = useState(false);
  const [category, setCategory] = useState(0);
  const [preview, setPreview] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);

  useEffect(() => {
    let active = true;
    getPlatformStats().then((result) => { if (active && result?.success) setStats(result.data); }).catch(() => {});
    getServiceRequestDropdowns().then((result) => {
      if (active) {
        if (result?.success && Array.isArray(result.data?.inspectionVerticals)) setVerticals(result.data.inspectionVerticals);
        else setCatalogueError(true);
      }
    }).catch(() => { if (active) setCatalogueError(true); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!menuOpen && !joinOpen) return undefined;
    const onEscape = (event) => {
      if (event.key === "Escape") { setMenuOpen(false); setJoinOpen(false); }
    };
    document.addEventListener("keydown", onEscape);
    return () => document.removeEventListener("keydown", onEscape);
  }, [menuOpen, joinOpen]);

  useEffect(() => {
    if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    const root = document.querySelector(".landing-page");
    const sections = document.querySelectorAll(".landing-page .landing-reveal");
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) { entry.target.classList.add("landing-revealed"); observer.unobserve(entry.target); }
      });
    }, { threshold: 0.08, rootMargin: "0px 0px 40px 0px" });
    sections.forEach((section) => observer.observe(section));
    root?.classList.add("landing-motion-ready");
    return () => { observer.disconnect(); root?.classList.remove("landing-motion-ready"); };
  }, []);

  const requestPath = isLoggedIn ? "/requests/new" : "/register-client";
  const workspacePath = isLoggedIn ? "/dashboard" : "/login";
  const metrics = landingMetrics(stats, verticals);
  const selected = verticals?.[category];
  const activePreview = previews[preview];

  return <div className="landing-page">
    <a className="landing-skip" href="#landing-main">Skip to content</a>
    <header className="landing-header"><div className="landing-container landing-header-inner">
      <Link className="landing-brand" to="/" aria-label="NexaPort home"><span className="landing-brand-mark"><Anchor size={21} aria-hidden="true"/></span><span>Nexa<strong>Port</strong></span></Link>
      <button className="landing-menu-toggle" type="button" aria-expanded={menuOpen} aria-controls="landing-navigation" aria-label={menuOpen ? "Close navigation" : "Open navigation"} onClick={() => setMenuOpen((open) => !open)}>{menuOpen ? <X size={24} aria-hidden="true"/> : <Menu size={24} aria-hidden="true"/>}</button>
      <nav id="landing-navigation" className={menuOpen ? "landing-navigation open" : "landing-navigation"} aria-label="Main navigation">
        <a href="#how-it-works" onClick={() => setMenuOpen(false)}>How it works</a><a href="#services" onClick={() => setMenuOpen(false)}>Inspection services</a><a href="#platform" onClick={() => setMenuOpen(false)}>Platform</a><a href="#directories" onClick={() => setMenuOpen(false)}>Directories</a>
        <div className="landing-join"><button type="button" className="landing-join-trigger" aria-expanded={joinOpen} aria-controls="landing-join-options" onClick={() => setJoinOpen((open) => !open)}>Join NexaPort <ChevronDown size={16} aria-hidden="true"/></button>{joinOpen && <div id="landing-join-options" className="landing-join-options"><Link to="/register-client" onClick={() => { setJoinOpen(false); setMenuOpen(false); }}>As a client</Link><Link to="/register-consultant" onClick={() => { setJoinOpen(false); setMenuOpen(false); }}>As a consultant or surveyor</Link><Link to="/register-maritime-company" onClick={() => { setJoinOpen(false); setMenuOpen(false); }}>As a maritime company</Link></div>}</div>
        <Link className="landing-nav-login" to={workspacePath}>{isLoggedIn ? "Open workspace" : "Sign in"}</Link>
      </nav>
    </div></header>

    <main id="landing-main">
      <section className="landing-hero" aria-labelledby="landing-title">
        <img className="landing-hero-image" src="/landing-cargo-vessel.jpg" width="2200" height="1467" alt="Commercial vessel at sea" fetchPriority="high"/>
        <div className="landing-container landing-hero-layout"><div className="landing-hero-copy"><p className="landing-hero-context">For the people who keep vessels moving</p><h1 id="landing-title">Marine inspections, managed end to end.</h1><p className="landing-hero-summary">Bring requests, quotations, survey work and reports into one connected workflow.</p><div className="landing-hero-actions"><Link className="landing-button landing-button-primary" to={requestPath}>Request a service <ArrowRight size={18} aria-hidden="true"/></Link><a className="landing-text-link" href="#platform">Explore NexaPort</a></div></div></div>
      </section>

      <section className="landing-statistics landing-reveal" aria-label="Current NexaPort directory and inspection catalogue counts"><div className="landing-container"><div className="landing-statistics-grid">{metrics.map((metric) => <div key={metric.label} className="landing-stat"><strong>{metricText(metric.value)}</strong><span>{metric.label}</span></div>)}</div><p className="landing-statistics-note">Current public directory and inspection catalogue counts. Indexed ports do not indicate inspection coverage.</p></div></section>

      <section className="landing-process landing-reveal" id="how-it-works" aria-labelledby="landing-process-title"><div className="landing-container"><div className="landing-section-head"><p className="landing-kicker">How NexaPort works</p><h2 id="landing-process-title">From request to report, with each decision in its place.</h2></div><ol className="landing-journey">{journey.map(([title, detail], index) => <li key={title}><span>{String(index + 1).padStart(2, "0")}</span><h3>{title}</h3><p>{detail}</p></li>)}</ol></div></section>

      <section className="landing-services landing-reveal" id="services" aria-labelledby="landing-services-title"><div className="landing-container"><div className="landing-section-head landing-services-head"><div><p className="landing-kicker">Inspection services</p><h2 id="landing-services-title">The right inspection for every stage of a vessel’s operation.</h2></div><p>Explore the active inspection catalogue by category. Select a discipline to see its available methods.</p></div>
        {verticals?.length ? <div className="landing-services-explorer"><div className="landing-category-list" aria-label="Inspection categories">{verticals.map((vertical, index) => <button key={vertical.id || vertical.slug || vertical.name} type="button" aria-pressed={index === category} onClick={() => setCategory(index)}><span>{String(index + 1).padStart(2, "0")}</span>{vertical.name}<ArrowRight size={16} aria-hidden="true"/></button>)}</div><div className="landing-service-detail" key={selected.id || selected.slug || category}><div className="landing-service-detail-head"><span>Selected discipline / {String(category + 1).padStart(2, "0")}</span><h3>{selected.name}</h3><p>{selected.methods?.length || 0} active inspection methods</p></div><ul>{(selected.methods || []).map((method) => <li key={method.id || method.slug || method.name}>{method.name}</li>)}</ul><Link className="landing-inline-link" to={requestPath}>Request this service <ArrowRight size={17} aria-hidden="true"/></Link></div></div> : <div className="landing-catalogue-unavailable" role="status">{catalogueError ? "The inspection catalogue is temporarily unavailable." : "Loading the inspection catalogue…"} <Link to={requestPath}>Start a request</Link></div>}
      </div></section>

      <section className="landing-platform landing-reveal" id="platform" aria-labelledby="landing-platform-title"><div className="landing-container"><div className="landing-section-head landing-platform-heading"><div><p className="landing-kicker">Inside NexaPort</p><h2 id="landing-platform-title">Keep the operating picture together.</h2></div><p>Follow inspection requests, quotations, assignments, field records and reports from a connected workspace.</p></div><div className="landing-product"><div className="landing-product-nav" aria-label="Platform capabilities">{previews.map((item, index) => <button type="button" key={item.label} aria-pressed={index === preview} onClick={() => setPreview(index)}>{item.label}</button>)}</div><div className="landing-product-screen" key={preview}><div className="landing-product-topline"><span>NEXAPORT / ILLUSTRATIVE WORKFLOW</span><span>Sample data</span></div><div className="landing-product-body"><div className="landing-product-intro"><p>{activePreview.eyebrow}</p><h3>{activePreview.title}</h3><span className="landing-product-status">{activePreview.status}</span></div><dl>{activePreview.fields.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><p className="landing-product-note">{activePreview.note}</p></div></div></div><Link className="landing-inline-link" to={workspacePath}>{isLoggedIn ? "Open your workspace" : "Sign in to your workspace"} <ArrowRight size={17} aria-hidden="true"/></Link></div></section>

      <section className="landing-audiences landing-reveal" id="for-you" aria-labelledby="landing-audiences-title"><div className="landing-container"><div className="landing-section-head"><p className="landing-kicker">Who NexaPort serves</p><h2 id="landing-audiences-title">A working place for every party around the vessel.</h2></div><div className="landing-audience-layout"><article className="landing-audience-client"><div><span>Shipowners &amp; vessel managers</span><h3>Commission with confidence. Stay close to the work.</h3></div><p>Submit inspection requests, review proposals and receive technical inspection reports.</p><Link to="/register-client">Request a service <ArrowRight size={18} aria-hidden="true"/></Link></article><div className="landing-audience-secondary"><article><span>Surveyors &amp; consultants</span><h3>Move from opportunity to assigned inspection.</h3><p>Access eligible requests, submit quotations and manage survey assignments.</p><Link to="/register-consultant">Register as a consultant <ArrowRight size={18} aria-hidden="true"/></Link></article><article><span>Maritime companies</span><h3>Keep your capabilities visible.</h3><p>Manage company profiles, services, branches, products and ports served.</p><Link to="/register-maritime-company">Register your company <ArrowRight size={18} aria-hidden="true"/></Link></article></div></div></div></section>

      <section className="landing-directories landing-reveal" id="directories" aria-labelledby="landing-directories-title"><div className="landing-container landing-directories-layout"><div className="landing-directories-copy"><p className="landing-kicker">Maritime directories</p><h2 id="landing-directories-title">The right context, alongside the work.</h2><p>Find vessels, ports, maritime companies and professionals from the appropriate workspace.</p><Link className="landing-inline-link" to={workspacePath}>{isLoggedIn ? "Open your workspace" : "Sign in to explore"} <ArrowRight size={17} aria-hidden="true"/></Link><div className="landing-directory-list">{directoryNames.map((name) => <span key={name}>{name}</span>)}</div></div><div className="landing-directory-visual"><img src="/landing-rotterdam.jpg" alt="Commercial port and vessels at Rotterdam" loading="lazy"/><div><strong>Structured maritime context</strong><p>Port name · Country · UN/LOCODE<br/>Vessel name · IMO · Vessel type<br/>Company category · Inspector specialization</p><small>Example field types, not live directory records</small></div></div></div></section>

      <section className="landing-capabilities landing-reveal" aria-labelledby="landing-capabilities-title"><div className="landing-container landing-capabilities-layout"><div><p className="landing-kicker">Operational capabilities</p><h2 id="landing-capabilities-title">The work after the request matters just as much.</h2></div><ol>{capabilities.map(([title, detail], index) => <li key={title}><span>{String(index + 1).padStart(2, "0")}</span><div><h3>{title}</h3><p>{detail}</p></div></li>)}</ol></div></section>

      <section className="landing-closing landing-reveal" aria-labelledby="landing-closing-title"><div className="landing-container landing-closing-layout"><div><p className="landing-kicker">Begin with a clear brief</p><h2 id="landing-closing-title">Start your next inspection with a clear brief.</h2><p>Bring the vessel, port and scope into one managed request.</p></div><div className="landing-closing-actions"><Link className="landing-button landing-button-light" to={requestPath}>Request a service <ArrowRight size={18} aria-hidden="true"/></Link><Link className="landing-text-link" to="/register-consultant">Register as a consultant</Link></div></div></section>
    </main>

    <footer className="landing-footer"><div className="landing-container"><div className="landing-footer-main"><div><Link className="landing-brand" to="/" aria-label="NexaPort home"><span className="landing-brand-mark"><Anchor size={21} aria-hidden="true"/></span><span>Nexa<strong>Port</strong></span></Link><p>Marine inspections, managed end to end.</p></div><nav aria-label="Footer navigation"><div><strong>Explore</strong><a href="#how-it-works">How it works</a><a href="#services">Inspection services</a><a href="#platform">Platform</a><a href="#directories">Maritime directories</a></div><div><strong>Get started</strong><Link to="/register-client">Client registration</Link><Link to="/register-consultant">Consultant registration</Link><Link to="/register-maritime-company">Maritime company registration</Link></div><div><strong>Account</strong><Link to={workspacePath}>{isLoggedIn ? "Open workspace" : "Sign in"}</Link></div></nav></div><div className="landing-footer-bottom"><span>© {new Date().getFullYear()} NexaPort</span></div></div></footer>
  </div>;
}
