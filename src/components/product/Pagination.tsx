import Link from "next/link";

interface Props {
  page: number;
  totalPages: number;
  searchParams: URLSearchParams;
}

export function Pagination({ page, totalPages, searchParams }: Props) {
  if (totalPages <= 1) return null;

  const createHref = (targetPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(targetPage));
    return `/?${params.toString()}`;
  };

  const pages: number[] = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, page + 2);
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  return (
    <div className="flex items-center justify-center gap-1 mt-8">
      {page > 1 && (
        <Link
          href={createHref(page - 1)}
          className="px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100"
        >
          上一页
        </Link>
      )}

      {start > 1 && (
        <>
          <Link
            href={createHref(1)}
            className="px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100"
          >
            1
          </Link>
          {start > 2 && <span className="px-1 text-gray-400">...</span>}
        </>
      )}

      {pages.map((p) => (
        <Link
          key={p}
          href={createHref(p)}
          className={`px-3 py-2 rounded-lg text-sm font-medium ${
            p === page
              ? "bg-blue-600 text-white"
              : "text-gray-700 hover:bg-gray-100"
          }`}
        >
          {p}
        </Link>
      ))}

      {end < totalPages && (
        <>
          {end < totalPages - 1 && <span className="px-1 text-gray-400">...</span>}
          <Link
            href={createHref(totalPages)}
            className="px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100"
          >
            {totalPages}
          </Link>
        </>
      )}

      {page < totalPages && (
        <Link
          href={createHref(page + 1)}
          className="px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100"
        >
          下一页
        </Link>
      )}
    </div>
  );
}