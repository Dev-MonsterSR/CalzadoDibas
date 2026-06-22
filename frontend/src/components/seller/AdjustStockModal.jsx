import { useState, useEffect, useMemo, useCallback } from 'react';
import { inventoryService } from '../../services';

const ALL_SIZES = [36, 37, 38, 39, 40, 41, 42, 43];

export default function AdjustStockModal({ isOpen, onClose, inventoryItem, onSuccess }) {
  // Cantidad a ajustar por talla (key = size, value = number). 0 = no se procesa.
  const [quantities, setQuantities] = useState({});
  // "add" = agregar stock (verde) | "subtract" = retirar stock (rojo)
  const [adjustmentType, setAdjustmentType] = useState('add');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Resetear estado al abrir/cerrar
  useEffect(() => {
    if (isOpen) {
      const initial = {};
      ALL_SIZES.forEach(s => { initial[s] = 0; });
      setQuantities(initial);
      setAdjustmentType('add');
      setReason('');
      setError(null);
    }
  }, [isOpen]);

  // ⚠️ REGLAS DE HOOKS: todos los hooks deben estar antes de cualquier return.
  // currentStockBySize: derivado de inventoryItem; si no hay item, mapa vacío
  const currentStockBySize = useMemo(() => {
    const map = {};
    const sizes = (inventoryItem && inventoryItem.sizes) || [];
    sizes.forEach(s => { map[s.size] = s.stock; });
    return map;
  }, [inventoryItem]);

  // Items seleccionados: tallas con quantity > 0
  const selectedItems = useMemo(() => {
    return ALL_SIZES
      .filter(s => quantities[s] && quantities[s] > 0)
      .map(s => ({
        size: s,
        quantity_change: adjustmentType === 'add' ? quantities[s] : -quantities[s]
      }));
  }, [quantities, adjustmentType]);

  const totalSelectedSizes = selectedItems.length;
  const totalNetChange = selectedItems.reduce((sum, i) => sum + i.quantity_change, 0);

  // Validación para restar
  const validationError = useMemo(() => {
    if (adjustmentType === 'subtract') {
      for (const s of ALL_SIZES) {
        if (quantities[s] > 0) {
          const current = currentStockBySize[s] || 0;
          if (quantities[s] > current) {
            return `No puedes retirar ${quantities[s]} uds de talla ${s}: solo hay ${current} disponibles.`;
          }
        }
      }
    }
    return null;
  }, [quantities, adjustmentType, currentStockBySize]);

  // Early return DESPUÉS de todos los hooks
  if (!isOpen || !inventoryItem) return null;

  const setQty = (size, value) => {
    const v = Math.max(0, parseInt(value) || 0);
    setQuantities(prev => ({ ...prev, [size]: v }));
  };

  const adjustQty = (size, delta) => {
    setQuantities(prev => ({ ...prev, [size]: Math.max(0, (prev[size] || 0) + delta) }));
  };

  const fillAll = () => {
    // Llenar con 1 en todas las tallas que tengan stock (útil para "agregar 1 par de cada")
    const next = {};
    ALL_SIZES.forEach(s => { next[s] = 1; });
    setQuantities(next);
  };

  const clearAll = () => {
    const next = {};
    ALL_SIZES.forEach(s => { next[s] = 0; });
    setQuantities(next);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (totalSelectedSizes === 0) {
      setError('Indica al menos una cantidad mayor a 0 en alguna talla.');
      return;
    }
    if (!reason || reason.trim().length < 3) {
      setError('Debes proporcionar una razón (mínimo 3 caracteres).');
      return;
    }
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      await inventoryService.adjustStockBatch({
        inventory_id: inventoryItem.id,
        items: selectedItems,
        reason: reason.trim()
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al ajustar stock');
    } finally {
      setLoading(false);
    }
  };

  const isAdd = adjustmentType === 'add';
  const accentBg = isAdd ? 'bg-green-500' : 'bg-error';
  const accentBgHover = isAdd ? 'hover:bg-green-600' : 'hover:bg-error/80';

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-surface-container rounded-xl border border-outline-variant max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-outline-variant/30 flex justify-between items-center">
          <div>
            <h2 className="font-title-lg text-title-lg text-on-surface">Ajustar Stock</h2>
            <p className="text-sm text-on-surface-variant mt-1">{inventoryItem.product_name}</p>
          </div>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-error-container/20 border border-error rounded-lg p-4 flex items-start gap-2">
              <span className="material-symbols-outlined text-error">error</span>
              <p className="text-sm text-error">{error}</p>
            </div>
          )}

          {/* Stock total + stock por talla actual */}
          <div className="bg-surface-variant/30 rounded-lg p-4">
            <p className="text-sm font-label-md text-on-surface-variant mb-3">Stock actual por talla</p>
            <div className="grid grid-cols-8 gap-2">
              {ALL_SIZES.map(s => (
                <div key={s} className="text-center p-2 bg-surface-container rounded border border-outline-variant/30">
                  <div className="text-xs text-on-surface-variant">{s}</div>
                  <div className="text-sm font-bold text-on-surface">{currentStockBySize[s] ?? 0}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Tipo de ajuste */}
          <div>
            <label className="block text-sm font-label-md text-on-surface mb-3">
              Tipo de Ajuste <span className="text-error">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setAdjustmentType('add')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  isAdd
                    ? 'border-green-500 bg-green-500/10 text-green-500'
                    : 'border-outline-variant/30 bg-surface-variant/30 text-on-surface hover:border-green-500/50'
                }`}
              >
                <span className="material-symbols-outlined text-2xl mb-1">add_circle</span>
                <div className="font-label-md">Agregar Stock</div>
                <div className="text-xs opacity-70 mt-1">Entrada de mercadería</div>
              </button>
              <button
                type="button"
                onClick={() => setAdjustmentType('subtract')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  !isAdd
                    ? 'border-error bg-error/10 text-error'
                    : 'border-outline-variant/30 bg-surface-variant/30 text-on-surface hover:border-error/50'
                }`}
              >
                <span className="material-symbols-outlined text-2xl mb-1">remove_circle</span>
                <div className="font-label-md">Retirar Stock</div>
                <div className="text-xs opacity-70 mt-1">Salida de mercadería</div>
              </button>
            </div>
          </div>

          {/* Tabla de tallas con cantidad */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-label-md text-on-surface">
                Cantidad por Talla <span className="text-error">*</span>
              </label>
              <div className="flex gap-2">
                <button type="button" onClick={fillAll} className="text-xs text-primary hover:underline">
                  Llenar con 1
                </button>
                <span className="text-on-surface-variant">·</span>
                <button type="button" onClick={clearAll} className="text-xs text-on-surface-variant hover:underline">
                  Limpiar
                </button>
              </div>
            </div>
            <div className="space-y-2">
              {ALL_SIZES.map(s => {
                const current = currentStockBySize[s] || 0;
                const qty = quantities[s] || 0;
                const isActive = qty > 0;
                const wouldBeNegative = !isAdd && qty > current;
                return (
                  <div
                    key={s}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                      isActive
                        ? wouldBeNegative
                          ? 'border-error bg-error/10'
                          : isAdd
                            ? 'border-green-500 bg-green-500/10'
                            : 'border-error bg-error/10'
                        : 'border-outline-variant/30 bg-surface-variant/20'
                    }`}
                  >
                    <div className="w-12 text-center">
                      <div className="text-lg font-bold text-on-surface">{s}</div>
                    </div>
                    <div className="text-xs text-on-surface-variant flex-1">
                      Stock: <span className="font-bold text-on-surface">{current}</span>
                      {isActive && (
                        <span className="ml-2">
                          → <span className={`font-bold ${isAdd ? 'text-green-500' : 'text-error'}`}>
                            {current + (isAdd ? qty : -qty)}
                          </span>
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => adjustQty(s, -1)}
                        disabled={qty === 0}
                        className="w-9 h-9 rounded bg-surface-variant/50 border border-outline-variant/30 text-on-surface hover:bg-surface-variant disabled:opacity-30 transition-all flex items-center justify-center"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>remove</span>
                      </button>
                      <input
                        type="number"
                        min="0"
                        max={isAdd ? 9999 : current}
                        value={qty}
                        onChange={(e) => setQty(s, e.target.value)}
                        className="w-16 h-9 bg-surface-container border border-outline-variant/30 rounded text-center text-base font-bold text-on-surface focus:ring-primary focus:border-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <button
                        type="button"
                        onClick={() => adjustQty(s, 1)}
                        className="w-9 h-9 rounded bg-surface-variant/50 border border-outline-variant/30 text-on-surface hover:bg-surface-variant transition-all flex items-center justify-center"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Resumen del batch */}
          {totalSelectedSizes > 0 && (
            <div className={`rounded-lg p-4 border ${isAdd ? 'bg-green-500/5 border-green-500/30' : 'bg-error/5 border-error/30'}`}>
              <p className={`text-sm font-label-md mb-1 ${isAdd ? 'text-green-500' : 'text-error'}`}>
                Resumen del ajuste
              </p>
              <p className="text-sm text-on-surface">
                <span className="font-bold">{totalSelectedSizes}</span> {totalSelectedSizes === 1 ? 'talla' : 'tallas'} · {isAdd ? '+' : ''}
                <span className="font-bold">{Math.abs(totalNetChange)}</span> unidades {isAdd ? 'agregadas' : 'retiradas'}
              </p>
            </div>
          )}

          {/* Razón */}
          <div>
            <label className="block text-sm font-label-md text-on-surface mb-3">
              Razón del Ajuste <span className="text-error">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej: Reposición de stock desde almacén, Devolución de cliente, Inventario físico, etc."
              className="w-full bg-surface-variant/30 border border-outline-variant/30 rounded-lg px-4 py-3 text-on-surface focus:ring-primary focus:border-primary resize-none"
              rows="3"
              required
            />
            <p className="text-xs text-on-surface-variant mt-1">
              Esta razón quedará registrada en el historial de movimientos (auditoría para el admin)
            </p>
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-4 border-t border-outline-variant/30">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-surface-variant/30 hover:bg-surface-variant/50 text-on-surface py-3 rounded-lg font-label-md transition-all"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || totalSelectedSizes === 0 || !!validationError}
              className={`flex-1 py-3 rounded-lg font-label-md transition-all flex items-center justify-center gap-2 text-white ${accentBg} ${accentBgHover} disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined animate-spin">progress_activity</span>
                  Aplicando...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined">{isAdd ? 'add_circle' : 'remove_circle'}</span>
                  {isAdd ? `Agregar a ${totalSelectedSizes} ${totalSelectedSizes === 1 ? 'talla' : 'tallas'}` : `Retirar de ${totalSelectedSizes} ${totalSelectedSizes === 1 ? 'talla' : 'tallas'}`}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
