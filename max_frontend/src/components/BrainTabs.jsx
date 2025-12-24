export default function BrainTabs({ menu, current, onSelect }) {
  return (
    <div className="flex gap-2 mb-4">
      {menu.map((it) => (
        <button
          key={it.code}
          className={`btn ${current === it.code ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => onSelect(it.code)}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}
