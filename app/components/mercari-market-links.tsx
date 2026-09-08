import { createMercariSearchUrl } from "../lib/mercari-search";

type MercariMarketLinksProps = {
  title: string;
  variant?: "full" | "compact";
};

export default function MercariMarketLinks({
  title,
  variant = "full",
}: MercariMarketLinksProps) {
  const lowUrl = createMercariSearchUrl(title, {
    soldOnly: true,
    order: "asc",
  });
  const highUrl = createMercariSearchUrl(title, {
    soldOnly: true,
    order: "desc",
  });

  if (variant === "compact") {
    return (
      <details className="group mt-2">
        <summary className="flex min-h-10 cursor-pointer list-none items-center justify-center rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-black text-rose-700 marker:content-none">
          <span className="group-open:hidden">メルカリ相場</span>
          <span className="hidden group-open:inline">メルカリ相場を閉じる</span>
        </summary>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <a
            href={lowUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-rose-200 bg-white px-3 py-2 text-center text-xs font-black text-rose-700"
          >
            安い順
          </a>
          <a
            href={highUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-gradient-to-r from-rose-500 to-red-500 px-3 py-2 text-center text-xs font-black text-white"
          >
            高い順
          </a>
        </div>
      </details>
    );
  }

  return (
    <div className="mt-3 rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50 to-red-50 p-4">
      <div className="flex items-center gap-3">
        <span className="rounded-lg bg-rose-500 px-2 py-1 text-xs font-black tracking-wide text-white shadow-sm">
          SOLD
        </span>
        <div>
          <h3 className="font-black text-gray-900">メルカリ相場を確認</h3>
          <p className="mt-0.5 text-xs font-medium text-gray-500">
            販売済み商品の価格帯をチェック
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:gap-3">
        <a
          href={lowUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="min-h-12 rounded-xl border border-rose-200 bg-white px-3 py-3 text-center text-sm font-black text-rose-700 shadow-sm"
        >
          安い順で見る
        </a>
        <a
          href={highUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="min-h-12 rounded-xl bg-gradient-to-r from-rose-500 to-red-500 px-3 py-3 text-center text-sm font-black text-white shadow-sm"
        >
          高い順で見る
        </a>
      </div>
    </div>
  );
}
