export const accountRoles = [
  { value: 'ADMINISTRADOR', label: 'Administrador' },
  { value: 'TRABAJADOR', label: 'Trabajador' },
]

export function roleLabel(role) {
  return accountRoles.find((item) => item.value === role)?.label || 'Rol no autorizado'
}
