import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

export default function QRScanner({ isOpen, onClose, onScan }) {
  const [mode, setMode] = useState('camera');
  const [manualCode, setManualCode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const scannerRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    if (isOpen && mode === 'camera') {
      // Pequeño delay para evitar race condition con cleanup
      const timer = setTimeout(() => {
        if (mounted) startCamera();
      }, 100);
      return () => {
        mounted = false;
        clearTimeout(timer);
        stopCamera();
      };
    }
    return () => {
      mounted = false;
      stopCamera();
    };
  }, [isOpen, mode]);

  const startCamera = async () => {
    try {
      setError('');
      setScanning(true);

      // Si ya hay un scanner creado, destruirlo completamente
      if (scannerRef.current) {
        try {
          const state = scannerRef.current.getState();
          if (state === 2) {
            // SCANNING - parar primero
            try { await scannerRef.current.stop(); } catch {}
          }
          try { scannerRef.current.clear(); } catch {}
        } catch (e) {
          // Si getState() falla, ignorar y continuar
        }
        scannerRef.current = null;
        // Pequeño delay para asegurar limpieza completa
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Verificar que el elemento DOM existe
      const element = document.getElementById('qr-reader');
      if (!element) {
        setError('Error: contenedor del scanner no encontrado.');
        setScanning(false);
        return;
      }

      scannerRef.current = new Html5Qrcode('qr-reader');

      await scannerRef.current.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          handleScan(decodedText);
        },
        (errorMessage) => {
          // Ignore scan errors, keep trying
        }
      );
    } catch (err) {
      console.error('Camera error:', err);
      setError('No se pudo acceder a la cámara. Usa el modo manual.');
      setScanning(false);
      setMode('manual');
    }
  };

  const stopCamera = async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === 2) { // SCANNING
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (err) {
        console.error('Stop camera error:', err);
      }
      scannerRef.current = null;
    }
    setScanning(false);
  };

  const handleScan = (token) => {
    stopCamera();
    onScan(token);
    handleClose();
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    const code = manualCode.trim();
    if (!code) {
      setError('Ingresa un código válido');
      return;
    }
    // Aceptar tanto con # como sin # (más tolerante)
    const normalized = code.startsWith('#') ? code : (code.startsWith('0') && code.length === 6 ? code : code);
    handleScan(normalized);
  };

  const handleClose = () => {
    stopCamera();
    setManualCode('');
    setError('');
    setMode('camera');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
      }}
    >
      <div
        className="rounded-xl max-w-md w-full p-6 relative"
        style={{
          background: 'rgba(24, 24, 27, 0.85)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 hover:opacity-70 transition-opacity"
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
        >
          <span className="material-symbols-outlined">close</span>
        </button>

        {/* Title */}
        <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 700, marginBottom: 24 }}>
          Escanear Codigo QR
        </h2>

        {/* Mode toggle */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setMode('camera')}
            className="flex-1 py-2 px-4 rounded-lg font-bold text-sm transition-all"
            style={{
              background: mode === 'camera' ? 'var(--primary-container)' : 'rgba(255,255,255,0.08)',
              color: mode === 'camera' ? '#000' : 'var(--text-muted)',
              border: 'none', cursor: 'pointer',
            }}
          >
            <span className="material-symbols-outlined text-sm mr-2">photo_camera</span>
            Camara
          </button>
          <button
            onClick={() => {
              setMode('manual');
              stopCamera();
            }}
            className="flex-1 py-2 px-4 rounded-lg font-bold text-sm transition-all"
            style={{
              background: mode === 'manual' ? 'var(--primary-container)' : 'rgba(255,255,255,0.08)',
              color: mode === 'manual' ? '#000' : 'var(--text-muted)',
              border: 'none', cursor: 'pointer',
            }}
          >
            <span className="material-symbols-outlined text-sm mr-2">keyboard</span>
            Manual
          </button>
        </div>

        {/* Camera mode */}
        {mode === 'camera' && (
          <div className="space-y-4">
            <div
              id="qr-reader"
              ref={containerRef}
              className="w-full aspect-square bg-surface-container-high rounded-lg overflow-hidden"
            />
            {scanning && (
              <p className="text-center text-on-surface-variant text-sm">
                Apunta la cámara al código QR del cliente
              </p>
            )}
            {error && (
              <div className="bg-error-container/20 border border-error rounded-lg p-3 text-error text-sm flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">error</span>
                {error}
              </div>
            )}
          </div>
        )}

        {/* Manual mode */}
        {mode === 'manual' && (
          <form onSubmit={handleManualSubmit} className="space-y-4">
            <div>
              <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: 13, marginBottom: 8, fontWeight: 500 }}>
                Ingresa el codigo del pedido
              </label>
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="#000022 o escanea el QR"
                autoFocus
                style={{
                  width: '100%', padding: '12px 14px',
                  background: 'var(--bg-dark)', border: '1px solid var(--outline-variant)',
                  borderRadius: 'var(--radius)', color: 'var(--text-primary)',
                  fontSize: 15, outline: 'none', boxSizing: 'border-box',
                }}
              />
              <p style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 6 }}>
                Pide al cliente su codigo de pedido (ej. <strong style={{ color: 'var(--text-secondary)' }}>#000022</strong>) o escanea su QR
              </p>
            </div>
            {error && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--error)',
                borderRadius: 'var(--radius)', padding: 12, color: 'var(--error)',
                fontSize: 13, display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>error</span>
                {error}
              </div>
            )}
            <button
              type="submit"
              className="w-full py-3 rounded-lg font-bold text-sm transition-all hover:brightness-110 active:scale-95"
              style={{ background: 'var(--primary-container)', color: '#000', border: 'none', cursor: 'pointer' }}
            >
              Confirmar Entrega
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
