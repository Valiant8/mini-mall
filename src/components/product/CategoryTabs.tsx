import Link from "next/link";

interface CategoryTab {
  id: string;
  name: string;
  slug: string;
  _count: { products: number };
}

interface Props {
  categories: CategoryTab[];
  activeSlug: string;
}

export function CategoryTabs({ categories, activeSlug }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      <Link
        href="/"
        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
          !activeSlug
            ? "bg-blue-600 text-white"
            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
        }`}
      >
        全部
      </Link>
      {categories.map((cat) => (
        <Link
          key={cat.id}
          href={`/?category=${cat.slug}`}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            activeSlug === cat.slug
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          {cat.name} ({cat._count.products})
        </Link>
      ))}
    </div>
  );
}