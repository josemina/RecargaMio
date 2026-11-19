// Validaciones en la app, iguales a las de la API (services/api/src/modulos/*/esquemas.ts), para avisar antes de enviar.
// La API vuelve a validar todo (regla 5): estas solo mejoran la experiencia.

export const correoValido = (correo: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim());

/** HU-06 CA-1: ocho caracteres o más, con letras y números. */
export function errorContrasena(contrasena: string): string | undefined {
  if (contrasena.length < 8) return 'La contraseña debe tener mínimo 8 caracteres.';
  if (!/\p{L}/u.test(contrasena)) return 'La contraseña debe tener al menos una letra.';
  if (!/\d/.test(contrasena)) return 'La contraseña debe tener al menos un número.';
  return undefined;
}

/** Número de la tarjeta MIO: 10 dígitos; se aceptan espacios y guiones. */
export const soloDigitos = (valor: string) => valor.replace(/\D/g, '');
export const numeroTarjetaValido = (valor: string) => /^\d{10}$/.test(soloDigitos(valor));

/** «1234 5678 90», como el reverso de la tarjeta (pantalla 2.2). */
export function formatearNumeroTarjeta(valor: string): string {
  const d = soloDigitos(valor).slice(0, 10);
  return [d.slice(0, 4), d.slice(4, 8), d.slice(8)].filter(Boolean).join(' ');
}

/** Celular colombiano: 10 dígitos que empiezan por 3. */
export const celularValido = (valor: string) => /^3\d{9}$/.test(soloDigitos(valor));
