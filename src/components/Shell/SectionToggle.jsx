import './SectionToggle.css';

function SectionToggle({ activeSection, onChange }) {
  return (
    <div className="section-toggle">
      <button
        className={activeSection === 'trade' ? 'active' : ''}
        onClick={() => onChange('trade')}
      >
        ComEx
      </button>
      <button
        className={activeSection === 'fdi' ? 'active' : ''}
        onClick={() => onChange('fdi')}
      >
        IED
      </button>
    </div>
  );
}

export default SectionToggle;
