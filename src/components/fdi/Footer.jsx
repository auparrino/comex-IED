import React from "react";
import "./Footer.css";

function Footer() {
  return (
    <footer className="footer">
      <span className="footer__text">
        Fuentes:{" "}
        <a
          className="footer__link"
          href="https://www.bcra.gob.ar"
          target="_blank"
          rel="noopener noreferrer"
        >
          BCRA
        </a>
        ,{" "}
        <a
          className="footer__link"
          href="https://www.indec.gob.ar"
          target="_blank"
          rel="noopener noreferrer"
        >
          INDEC
        </a>
        ,{" "}
        <a
          className="footer__link"
          href="https://unctad.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          UNCTAD
        </a>
        . Datos sujetos a revision. Este monitor no constituye asesoramiento
        financiero ni recomendacion de inversion.
      </span>
    </footer>
  );
}

export default Footer;
