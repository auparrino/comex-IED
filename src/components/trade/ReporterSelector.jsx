import './ReporterSelector.css';

const ISO2_MAP = { arg: 'ar', ury: 'uy', pry: 'py' };

export default function ReporterSelector({ reporters, active, onChange }) {
  if (!reporters) return null;

  return (
    <div className="reporter-selector">
      {reporters.map(r => {
        const iso2 = ISO2_MAP[r.key] || r.iso2?.toLowerCase() || r.key;
        return (
          <button
            key={r.key}
            className={`reporter-btn ${active === r.key ? 'active' : ''}`}
            onClick={() => onChange(r.key)}
            title={r.name}
          >
            <img
              className="reporter-flag"
              src={`https://flagcdn.com/w40/${iso2}.png`}
              alt={r.name}
              width="20"
              height="15"
            />
            <span className="reporter-name">{r.name}</span>
          </button>
        );
      })}
    </div>
  );
}
