"use client";

import { useState } from "react";

export default function EbayResearchBox() {
  const [keyword, setKeyword] = useState("");
  const trimmedKeyword = keyword.trim();

  return (
    <section className="mb-6 rounded-2xl bg-gradient-to-br from-blue-700 to-blue-500 p-5 text-white shadow-sm sm:p-6">
      <div className="flex items-start gap-3">
        <span className="text-2xl" aria-hidden="true">
          🌎
        </span>
        <div>
          <h2 className="text-lg font-black">商品名から直接eBay調査</h2>
          <p className="mt-1 text-sm font-medium text-blue-50">
            楽天・Amazonの商品を選ばなくても、日本語のまま調査できます
          </p>
        </div>
      </div>

      <form
        action="/api/ebay/research"
        method="get"
        target="_blank"
        className="mt-4 flex flex-col gap-3 sm:flex-row"
      >
        <input
          name="title"
          type="search"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder="例：ポケモンカード、漫画、財布"
          aria-label="eBayで直接調査する商品名"
          className="min-h-12 flex-1 rounded-xl border border-white/30 bg-white px-4 py-3 font-bold text-gray-900 placeholder:font-medium placeholder:text-gray-400"
        />
        <button
          type="submit"
          disabled={!trimmedKeyword}
          className="min-h-12 rounded-xl bg-white px-5 py-3 text-center font-black text-blue-700 shadow-sm disabled:bg-blue-300/50 disabled:text-blue-100 disabled:shadow-none"
        >
          {trimmedKeyword ? "売れ行きを調査 ↗" : "商品名を入力"}
        </button>
      </form>
    </section>
  );
}
