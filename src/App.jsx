import { useState } from 'react';
import AppHeader from './components/Shell/AppHeader';
import Footer from './components/Shell/Footer';
import TradeSection from './components/trade/TradeSection';
import FdiSection from './components/fdi/FdiSection';
import './App.css';

function App() {
  const [activeSection, setActiveSection] = useState('trade');

  return (
    <div className="app">
      <AppHeader activeSection={activeSection} onSectionChange={setActiveSection} />
      <main className="app-main">
        <div className={`section-wrapper ${activeSection !== 'trade' ? 'hidden' : ''}`}>
          <TradeSection />
        </div>
        <div className={`section-wrapper ${activeSection !== 'fdi' ? 'hidden' : ''}`}>
          <FdiSection />
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default App;
