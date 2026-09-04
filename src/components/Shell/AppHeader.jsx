import SectionToggle from './SectionToggle';
import { setViewMode } from '../../mobile/hooks/useMobileBreakpoint';
import './AppHeader.css';

function AppHeader({ activeSection, onSectionChange }) {
  return (
    <header className="app-header">
      <div className="header-center">
        <SectionToggle activeSection={activeSection} onChange={onSectionChange} />
      </div>
      <button className="switch-to-mobile-btn" onClick={() => setViewMode('mobile')}>
        Ver versión mobile
      </button>
    </header>
  );
}

export default AppHeader;
