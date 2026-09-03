"use client";

export type MainNavigationTab = "home" | "research" | "inventory" | "ledger";

type AppNavigationProps = {
  activeTab: MainNavigationTab;
  onNavigate: (tab: MainNavigationTab) => void;
};

const items: { tab: MainNavigationTab; icon: string; label: string }[] = [
  { tab: "home", icon: "🏠", label: "ホーム" },
  { tab: "research", icon: "🔍", label: "リサーチ" },
  { tab: "inventory", icon: "📦", label: "在庫" },
  { tab: "ledger", icon: "📊", label: "収支" },
];

export default function AppNavigation({
  activeTab,
  onNavigate,
}: AppNavigationProps) {
  return (
    <nav
      aria-label="メインナビゲーション"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-100 bg-white/95 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_25px_rgba(76,29,149,0.08)] backdrop-blur sm:left-1/2 sm:max-w-2xl sm:-translate-x-1/2 sm:rounded-t-3xl sm:border-x"
    >
      <div className="mx-auto grid max-w-2xl grid-cols-4 gap-1">
        {items.map((item) => {
          const isActive = activeTab === item.tab;

          return (
            <button
              key={item.tab}
              type="button"
              onClick={() => onNavigate(item.tab)}
              aria-current={isActive ? "page" : undefined}
              className={`min-h-14 rounded-2xl px-1 py-1 text-center transition active:scale-95 ${
                isActive ? "bg-violet-50 text-violet-700" : "text-gray-500"
              }`}
            >
              <span className="block text-xl leading-6" aria-hidden="true">{item.icon}</span>
              <span className="mt-0.5 block text-[10px] font-black sm:text-xs">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
