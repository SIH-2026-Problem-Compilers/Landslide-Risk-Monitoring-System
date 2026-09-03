export function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="h-4 bg-gray-200 rounded w-24" />
          <div className="h-8 bg-gray-200 rounded w-16 mt-3" />
          <div className="h-3 bg-gray-200 rounded w-20 mt-2" />
        </div>
        <div className="w-12 h-12 bg-gray-200 rounded-xl" />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden animate-pulse">
      <div className="p-4 border-b border-gray-100">
        <div className="h-5 bg-gray-200 rounded w-40" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="p-4 border-b border-gray-50 flex items-center gap-4">
          <div className="w-8 h-8 bg-gray-200 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4" />
            <div className="h-3 bg-gray-100 rounded w-1/2" />
          </div>
          <div className="h-6 bg-gray-200 rounded-full w-16" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
      <div className="h-5 bg-gray-200 rounded w-40 mb-6" />
      <div className="h-64 bg-gray-100 rounded-lg" />
    </div>
  );
}

export function SkeletonMap() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden animate-pulse">
      <div className="p-4 border-b border-gray-100">
        <div className="h-5 bg-gray-200 rounded w-40" />
      </div>
      <div className="h-[500px] bg-gray-100 flex items-center justify-center">
        <div className="text-gray-400 text-sm">Loading map...</div>
      </div>
    </div>
  );
}
