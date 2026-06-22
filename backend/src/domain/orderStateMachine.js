export const ORDER_STATES = [
  'pendiente',
  'pendiente_validacion',
  'pagado',
  'preparando',
  'enviado',
  'listo_recojo',
  'entregado',
  'cancelado',
  'rechazado_pago',
];

const TRANSITIONS = {
  pendiente: ['pendiente_validacion', 'cancelado'],
  pendiente_validacion: ['pagado', 'rechazado_pago', 'cancelado'],
  pagado: ['preparando', 'cancelado'],
  preparando: ['enviado', 'listo_recojo', 'cancelado'],
  enviado: ['entregado'],
  listo_recojo: ['entregado'],
  entregado: [],
  cancelado: [],
  rechazado_pago: ['pendiente'],
};

const ROLE_PERMISSIONS = {
  pendiente_validacion: ['cliente'],
  pagado: ['admin', 'fabrica'],
  rechazado_pago: ['admin', 'fabrica'],
  preparando: ['admin', 'fabrica'],
  enviado: ['admin', 'fabrica'],
  listo_recojo: ['admin', 'fabrica'],
  entregado: ['admin', 'fabrica', 'vendedor_trujillo', 'vendedor_lima'],
  cancelado: ['admin', 'fabrica', 'cliente'],
  pendiente: ['cliente'],
};

export function canTransition(from, to) {
  const allowed = TRANSITIONS[from];
  if (!allowed) return false;
  return allowed.includes(to);
}

export function canActorPerform(role, targetState) {
  const allowed = ROLE_PERMISSIONS[targetState];
  if (!allowed) return false;
  return allowed.includes(role);
}

export function getValidTransitions(from) {
  return TRANSITIONS[from] || [];
}
