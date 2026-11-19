// Páginas HTML de la API (restablecer la contraseña y pasarela simulada) con una política de contenido estricta.
// Hallazgos de OWASP ZAP 10055 («CSP: Wildcard Directive» y «CSP: style-src unsafe-inline»), ADR 0016:
// en vez de permitir cualquier estilo en línea, se autoriza solo el bloque <style> exacto de cada página por su hash.
import { createHash } from 'node:crypto';
import type { Response } from 'express';

export function politicaContenidoHtml(html: string): string {
  const estilos = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map(
    ([, css]) => `'sha256-${createHash('sha256').update(css).digest('base64')}'`,
  );
  return [
    "default-src 'none'",
    `style-src ${estilos.length ? estilos.join(' ') : "'none'"}`,
    "img-src 'self'",
    "form-action 'self'",
    "base-uri 'none'",
    "frame-ancestors 'none'",
  ].join('; ');
}

export function enviarHtml(res: Response, html: string, estado = 200) {
  res.status(estado).type('html').set('Content-Security-Policy', politicaContenidoHtml(html)).send(html);
}
