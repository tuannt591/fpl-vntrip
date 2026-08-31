export default function H2HLoading() {
  return (
    <main
      aria-busy="true"
      aria-label="Đang mở H2H Arena"
      className="container mx-auto max-w-2xl animate-pulse px-3 py-4 pb-0 sm:px-4 sm:pb-8"
    >
      <div className="mb-4 space-y-2">
        <div className="h-3 w-20 rounded bg-muted" />
        <div className="h-6 w-32 rounded bg-muted" />
      </div>
      <section className="space-y-4 rounded-3xl border bg-card p-5 sm:p-6">
        <div className="h-6 w-2/5 rounded bg-muted" />
        <div className="h-4 w-full rounded bg-muted" />
        <div className="h-4 w-4/5 rounded bg-muted" />
        <div className="h-12 w-full rounded-2xl bg-muted" />
      </section>
    </main>
  );
}
