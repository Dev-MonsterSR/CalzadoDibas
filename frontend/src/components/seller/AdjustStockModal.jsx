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
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        style={{
          background: 'rgba(24, 24, 27, 0.85)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 12,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ color: '#fff', fontSize: 18, fontWeight: 700, marginBottom: 2 }}>Ajustar Stock</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>{inventoryItem.product_name}</p>
          </div>
          <button
            onClick={onClose}
            className="hover:opacity-70 transition-opacity"
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <button
                type="button"
                onClick={() => setAdjustmentType('add')}
                className="transition-all hover:brightness-110"
                style={{
                  padding: 20, borderRadius: 12,
                  border: isAdd ? '2px solid #c8a96e' : '1px solid rgba(255,255,255,0.08)',
                  background: isAdd ? 'rgba(200, 169, 110, 0.12)' : 'rgba(255,255,255,0.04)',
                  color: isAdd ? '#c8a96e' : '#a1a1aa',
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 28, marginBottom: 4, display: 'block', color: isAdd ? '#c8a96e' : '#71717a' }}>add_circle</span>
                <div style={{ fontSize: 14, fontWeight: 700 }}>Agregar Stock</div>
                <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>Entrada de mercaderia</div>
              </button>
              <button
                type="button"
                onClick={() => setAdjustmentType('subtract')}
                className="transition-all hover:brightness-110"
                style={{
                  padding: 20, borderRadius: 12,
                  border: !isAdd ? '2px solid #ef4444' : '1px solid rgba(255,255,255,0.08)',
                  background: !isAdd ? 'rgba(239, 68, 68, 0.12)' : 'rgba(255,255,255,0.04)',
                  color: !isAdd ? '#ef4444' : '#a1a1aa',
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 28, marginBottom: 4, display: 'block', color: !isAdd ? '#ef4444' : '#71717a' }}>remove_circle</span>
                <div style={{ fontSize: 14, fontWeight: 700 }}>Retirar Stock</div>
                <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>Salida de mercaderia</div>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {ALL_SIZES.map(s => {
                const current = currentStockBySize[s] || 0;
                const qty = quantities[s] || 0;
                const isActive = qty > 0;
                const wouldBeNegative = !isAdd && qty > current;
                return (
                  <div
                    key={s}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 10,
                      border: isActive
                        ? (wouldBeNegative || !isAdd)
                          ? '1px solid rgba(239, 68, 68, 0.4)'
                          : '1px solid rgba(200, 169, 110, 0.4)'
                        : '1px solid rgba(255,255,255,0.06)',
                      background: isActive
                        ? (wouldBeNegative || !isAdd)
                          ? 'rgba(239, 68, 68, 0.06)'
                          : 'rgba(200, 169, 110, 0.06)'
                        : 'rgba(255,255,255,0.02)',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ width: 48, textAlign: 'center' }}>
                      <div style={{ color: '#fff', fontSize: 18, fontWeight: 700 }}>{s}</div>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', flex: 1 }}>
                      Stock: <span style={{ fontWeight: 700, color: '#fff' }}>{current}</span>
                      {isActive && (
                        <span style={{ marginLeft: 8 }}>
                          → <span style={{
                            fontWeight: 700,
                            color: !isAdd ? '#ef4444' : '#c8a96e',
                          }}>
                            {current + (isAdd ? qty : -qty)}
                          </span>
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <button
                        type="button"
                        onClick={() => adjustQty(s, -1)}
                        disabled={qty === 0}
                        className="transition-all hover:brightness-110 active:scale-95"
                        style={{
                          width: 36, height: 36, borderRadius: 8,
                          background: 'rgba(255,255,255,0.06)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          color: qty === 0 ? '#52525b' : '#fff',
                          cursor: qty === 0 ? 'not-allowed' : 'pointer',
                          opacity: qty === 0 ? 0.4 : 1,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>remove</span>
                      </button>
                      <input
                        type="number"
                        min="0"
                        max={isAdd ? 9999 : current}
                        value={qty}
                        onChange={(e) => setQty(s, e.target.value)}
                        style={{
                          width: 64, height: 36,
                          background: 'rgba(24, 24, 27, 0.8)',
                          border: '1px solid rgba(255,255,255,0.12)',
                          borderRadius: 8, textAlign: 'center',
                          fontSize: 14, fontWeight: 700, color: '#fff',
                          outline: 'none',
                          boxSizing: 'border-box',
                          WebkitAppearance: 'none', MozAppearance: 'textfield',
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => adjustQty(s, 1)}
                        className="transition-all hover:brightness-110 active:scale-95"
                        style={{
                          width: 36, height: 36, borderRadius: 8,
                          background: 'rgba(200, 169, 110, 0.15)',
                          border: '1px solid rgba(200, 169, 110, 0.3)',
                          color: '#c8a96e',
                          cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
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
            <div style={{
              borderRadius: 10, padding: 16,
              border: isAdd ? '1px solid rgba(200, 169, 110, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
              background: isAdd ? 'rgba(200, 169, 110, 0.08)' : 'rgba(239, 68, 68, 0.08)',
            }}>
              <p style={{
                fontSize: 13, fontWeight: 700, marginBottom: 4,
                color: isAdd ? '#c8a96e' : '#ef4444',
              }}>
                Resumen del ajuste
              </p>
              <p style={{ fontSize: 13, color: '#fff' }}>
                <span style={{ fontWeight: 700 }}>{totalSelectedSizes}</span> {totalSelectedSizes === 1 ? 'talla' : 'tallas'} · {isAdd ? '+' : ''}
                <span style={{ fontWeight: 700 }}>{Math.abs(totalNetChange)}</span> unidades {isAdd ? 'agregadas' : 'retiradas'}
              </p>
            </div>
          )}

          {/* Razón */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 8 }}>
              Razon del Ajuste <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej: Reposicion de stock desde almacen, Devolucion de cliente, Inventario fisico, etc."
              required
              rows="3"
              style={{
                width: '100%', padding: 12, borderRadius: 8,
                background: 'rgba(24, 24, 27, 0.8)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: '#fff', fontSize: 13, resize: 'vertical',
                outline: 'none', boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
            />
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              Esta razon quedara registrada en el historial de movimientos (auditoria para el admin)
            </p>
          </div>

          {/* Botones */}
          <div style={{ display: 'flex', gap: 12, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="transition-all hover:brightness-110"
              style={{
                flex: 1, padding: '12px 16px', borderRadius: 8,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#fff', fontSize: 13, fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.5 : 1,
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || totalSelectedSizes === 0 || !!validationError}
              className="transition-all hover:brightness-110 active:scale-95"
              style={{
                flex: 1, padding: '12px 16px', borderRadius: 8,
                background: isAdd ? '#c8a96e' : '#ef4444',
                border: 'none',
                color: isAdd ? '#000' : '#fff', fontSize: 13, fontWeight: 700,
                cursor: (loading || totalSelectedSizes === 0 || !!validationError) ? 'not-allowed' : 'pointer',
                opacity: (loading || totalSelectedSizes === 0 || !!validationError) ? 0.5 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined" style={{ animation: 'spin 1s linear infinite' }}>progress_activity</span>
                  Aplicando...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{isAdd ? 'add_circle' : 'remove_circle'}</span>
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
