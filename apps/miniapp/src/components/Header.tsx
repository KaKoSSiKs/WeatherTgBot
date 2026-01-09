type Props = {
  initData: boolean;
  onOpenBot: () => void;
};

export const Header = ({ initData, onOpenBot }: Props) => (
  <header className="pt-4 pb-3 flex items-center justify-between">
    <div>
      <div className="text-lg sm:text-xl font-bold text-slate-900">🌤️ Погода</div>
      <div className="text-xs text-slate-500 mt-0.5">
        {initData ? '✅ Связано с ботом' : '🔧 Режим разработки'}
      </div>
    </div>
    {initData && (
      <button
        className="text-xs sm:text-sm px-3 py-2 rounded-full bg-blue-500 hover:bg-blue-600 text-white shadow-md active:scale-95 transition-all duration-200 font-medium"
        onClick={onOpenBot}
      >
        Бот
      </button>
    )}
  </header>
);

