import SectionToggle from './SectionToggle';
import './AppHeader.css';

function AppHeader({ activeSection, onSectionChange }) {
  return (
    <header className="app-header">
      <div className="header-center">
        <SectionToggle activeSection={activeSection} onChange={onSectionChange} />
      </div>
    </header>
  );
}

export default AppHeader;
