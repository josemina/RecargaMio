// Página web sencilla para crear una nueva contraseña desde el enlace del correo (ADR 0011).
// Funciona en cualquier navegador, sin JavaScript (compatible con la política CSP de helmet).
// Colores tomados de los tokens de Figma (RecargaMIO · Color).
import { escaparHtml } from './servicio';

interface Opciones {
  token?: string;
  error?: string;
  exito?: boolean;
}

export function paginaRestablecer({ token = '', error, exito }: Opciones): string {
  const contenido = exito
    ? `<div class="aviso exito" role="status"><strong>¡Listo!</strong> Tu contraseña se cambió. Ya puedes ingresar en la app RecargaMIO con la nueva contraseña.</div>`
    : `
      <p>Escribe tu nueva contraseña. Debe tener mínimo 8 caracteres, con letras y números.</p>
      ${error ? `<div class="aviso error" role="alert">${escaparHtml(error)}</div>` : ''}
      <form method="post" action="/restablecer" novalidate>
        <input type="hidden" name="token" value="${escaparHtml(token)}">
        <label for="contrasena">Nueva contraseña</label>
        <input id="contrasena" name="contrasena" type="password" autocomplete="new-password" minlength="8" required>
        <label for="confirmacion">Confirmar contraseña</label>
        <input id="confirmacion" name="confirmacion" type="password" autocomplete="new-password" minlength="8" required>
        <button type="submit">Guardar contraseña</button>
      </form>`;

  return `<!doctype html>
<html lang="es-CO">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex">
  <title>Restablecer contraseña · RecargaMIO</title>
  <style>
    body { margin: 0; background: #F4F6FA; color: #1B1F2A; font: 16px/1.5 Inter, -apple-system, "Segoe UI", Roboto, sans-serif; }
    main { max-width: 390px; margin: 0 auto; padding: 32px 24px; }
    .marca { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; }
    .logo { width: 48px; height: 48px; border-radius: 12px; background: #0B3D91; color: #fff; display: grid; place-items: center; font-weight: 700; font-size: 22px; }
    h1 { font-size: 24px; line-height: 30px; margin: 0 0 8px; }
    label { display: block; font-size: 13px; font-weight: 500; color: #5B6475; margin: 16px 0 6px; }
    input[type=password] { box-sizing: border-box; width: 100%; min-height: 48px; padding: 12px 16px; font-size: 16px; border: 1px solid #C7CEDB; border-radius: 12px; background: #fff; }
    input:focus { outline: 2px solid #0B3D91; outline-offset: 1px; }
    button { width: 100%; min-height: 48px; margin-top: 24px; border: 0; border-radius: 12px; background: #0B3D91; color: #fff; font-size: 16px; font-weight: 600; cursor: pointer; }
    .aviso { border-radius: 12px; padding: 12px 16px; margin: 16px 0; }
    .error { background: #FDE8E8; color: #C62828; }
    .exito { background: #DDF3E3; color: #1E8E3E; }
    .pie { margin-top: 32px; font-size: 12px; color: #6F7889; text-align: center; }
  </style>
</head>
<body>
  <main>
    <div class="marca"><div class="logo" aria-hidden="true">R</div><strong>RecargaMIO</strong></div>
    <h1>Crea una nueva contraseña</h1>
    ${contenido}
    <p class="pie">Prototipo académico UNAD · Pagos en modo de pruebas</p>
  </main>
</body>
</html>`;
}
