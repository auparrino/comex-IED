import './Footer.css';

function Footer() {
  return (
    <footer className="app-footer">
      <div className="footer-sources">
        <span>Fuentes:</span>
        <a href="https://www.bcra.gob.ar" target="_blank" rel="noopener noreferrer">BCRA</a>
        <span>&middot;</span>
        <a href="https://www.indec.gob.ar" target="_blank" rel="noopener noreferrer">INDEC</a>
        <span>&middot;</span>
        <a href="https://unctad.org" target="_blank" rel="noopener noreferrer">UNCTAD</a>
        <span>&middot;</span>
        <a href="https://comtrade.un.org" target="_blank" rel="noopener noreferrer">Comtrade</a>
      </div>
      <div className="footer-disclaimer">
        Los datos son de acceso p&uacute;blico y se presentan con fines informativos.
      </div>
    </footer>
  );
}

export default Footer;
