export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-paper">
      <header className="bg-surface border-b border-line">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-line animate-pulse" />
          <div className="space-y-2">
            <div className="h-3.5 w-32 rounded bg-line animate-pulse" />
            <div className="h-3 w-44 rounded bg-line animate-pulse" />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="bg-surface rounded-2xl border border-line p-6 mb-8">
          <div className="h-4 w-40 rounded bg-line animate-pulse mb-4" />
          <div className="h-2.5 rounded-full bg-line animate-pulse mb-6" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-line animate-pulse" />
                <div className="space-y-2">
                  <div className="h-6 w-8 rounded bg-line animate-pulse" />
                  <div className="h-3 w-28 rounded bg-line animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-7 w-20 rounded-full bg-line animate-pulse" />
          ))}
        </div>

        <div className="bg-surface rounded-2xl border border-line divide-y divide-line overflow-hidden">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-stretch">
              <div className="w-1 shrink-0 bg-line animate-pulse" />
              <div className="flex-1 p-5 flex items-center justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-1/3 rounded bg-line animate-pulse" />
                  <div className="h-3 w-1/2 rounded bg-line animate-pulse" />
                </div>
                <div className="h-6 w-20 rounded-full bg-line animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}