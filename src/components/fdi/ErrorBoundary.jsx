import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("ErrorBoundary caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      const message =
        this.props.fallbackMessage ||
        "Ocurrio un error inesperado. Intente recargar la pagina.";
      return (
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: "24px 32px",
            margin: 24,
            color: "var(--text-secondary)",
            fontSize: 14,
          }}
        >
          <strong style={{ color: "var(--text-primary)" }}>
            Algo salio mal
          </strong>
          <p style={{ margin: "8px 0 0" }}>{message}</p>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
