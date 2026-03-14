interface FilterToggleButtonProps {
  showFilter: boolean;
  filtersActive: boolean;
  onClick: () => void;
}

export default function FilterToggleButton({
  showFilter,
  filtersActive,
  onClick,
}: FilterToggleButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
        showFilter || filtersActive
          ? "bg-amber-100 border-amber-300 text-amber-800"
          : "bg-white border-stone-300 text-stone-500 hover:border-stone-400"
      }`}
      aria-expanded={showFilter}
      aria-label="Filter ein-/ausblenden"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 256 256"
        className="w-4 h-4"
        fill="currentColor"
      >
        <path d="M200,136a8,8,0,0,1-8,8H64a8,8,0,0,1,0-16H192A8,8,0,0,1,200,136Zm32-56H24a8,8,0,0,0,0,16H232a8,8,0,0,0,0-16Zm-80,96H104a8,8,0,0,0,0,16h48a8,8,0,0,0,0-16Z" />
      </svg>
      Filter
    </button>
  );
}
