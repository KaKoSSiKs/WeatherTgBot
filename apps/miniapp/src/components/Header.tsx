type Props = {
  initData: boolean;
  onOpenBot: () => void;
};

export const Header = ({ initData, onOpenBot }: Props) => (
  <header className="pt-4 flex items-center justify-between">
    <div>
      <div className="text-lg font-semibold">Weather MiniApp</div>
      <div className="text-xs text-slate-500">{initData ? 'Связано с ботом' : 'Standalone (dev)'}</div>
    </div>
    <button
      className="text-sm px-3 py-2 rounded-full bg-primary text-white shadow-sm active:scale-[0.98]"
      onClick={onOpenBot}
    >
      Открыть в @apps
    </button>
  </header>
);

