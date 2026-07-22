import "./DirectoryScaffold.css";

export default function DirectoryScaffold({ directory }) {
  const Icon = directory.icon;

  return (
    <main className="directory-scaffold">
      <header className="directory-scaffold__header">
        <div className="directory-scaffold__mark" aria-hidden="true"><Icon size={22} /></div>
        <div>
          <span>Super Admin</span>
          <h1>{directory.label}</h1>
          <p>{directory.description}</p>
        </div>
      </header>

      <section className="directory-scaffold__empty" aria-labelledby="directory-empty-title">
        <Icon size={24} aria-hidden="true" />
        <div>
          <h2 id="directory-empty-title">No records have been added to this directory yet.</h2>
          <p>This directory is ready for records when data management is added.</p>
        </div>
      </section>
    </main>
  );
}
