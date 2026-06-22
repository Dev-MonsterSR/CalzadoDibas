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
    if (isOpen && mode === 'camera') {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, mode]);

  const startCamera = async () => {
    try {
      setError('');
      setScanning(true);
      
      if (scannerRef.current) {
        await stopCamera();
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
        scannerRef.current = null;
      } catch (err) {
        console.error('Stop camera error:', err);
      }
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
    if (!manualCode.trim()) {
      setError('Ingresa un código válido');
      return;
    }
    handleScan(manualCode.trim());
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
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-surface-container rounded-xl max-w-md w-full p-6 relative">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-on-surface-variant hover:text-on-surface transition-colors"
        >
          <span className="material-symbols-outlined">close</span>
        </button>

        {/* Title */}
        <h2 className="font-title-md text-title-md text-on-surface mb-6">
          Escanear Código QR
        </h2>

        {/* Mode toggle */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setMode('camera')}
            className={`flex-1 py-2 px-4 rounded-lg font-label-md transition-all ${
              mode === 'camera'
                ? 'bg-primary-container text-on-primary-container'
                : 'bg-surface-variant/30 text-on-surface-variant hover:bg-surface-variant/50'
            }`}
          >
            <span className="material-symbols-outlined text-sm mr-2">photo_camera</span>
            Cámara
          </button>
          <button
            onClick={() => {
              setMode('manual');
              stopCamera();
            }}
            className={`flex-1 py-2 px-4 rounded-lg font-label-md transition-all ${
              mode === 'manual'
                ? 'bg-primary-container text-on-primary-container'
                : 'bg-surface-variant/30 text-on-surface-variant hover:bg-surface-variant/50'
            }`}
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
              <label className="block text-on-surface-variant text-sm mb-2">
                Ingresa el código del QR
              </label>
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Pega el código aquí..."
                className="w-full bg-surface-variant/30 border border-outline-variant/30 rounded-lg px-4 py-3 text-on-surface focus:ring-primary focus:border-primary"
                autoFocus
              />
            </div>
            {error && (
              <div className="bg-error-container/20 border border-error rounded-lg p-3 text-error text-sm flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">error</span>
                {error}
              </div>
            )}
            <button
              type="submit"
              className="w-full bg-primary-container text-on-primary-container py-3 rounded-lg font-label-md hover:brightness-110 active:scale-95 transition-all"
            >
              Verificar Código
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
