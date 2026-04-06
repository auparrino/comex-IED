import { useEffect } from 'react';

export default function BottomSheet({ open, title, onClose, children, full = false }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div className="m-sheet-backdrop" onClick={onClose} />
      <div className={`m-sheet${full ? ' m-sheet--full' : ''}`} role="dialog" aria-modal="true">
        <div className="m-sheet__handle" />
        {title && (
          <div className="m-sheet__header">
            <div className="m-sheet__title">{title}</div>
            <button className="m-sheet__close" onClick={onClose} aria-label="Cerrar">×</button>
          </div>
        )}
        <div className="m-sheet__body">{children}</div>
      </div>
    </>
  );
}
