// Genera el manual de RecargaMIO en Word (.docx) y PDF a partir de los capítulos en Markdown.
// Formato inspirado en APA 7: Times New Roman 12, interlineado doble, márgenes de 2,54 cm,
// número de página arriba a la derecha, encabezados por niveles y figuras/tablas numeradas con título.
// Uso: npm run manual (desde la raíz del repositorio)
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  AlignmentType, BorderStyle, Document, ExternalHyperlink, Footer, Header, HeadingLevel, ImageRun,
  LevelFormat, Packer, PageBreak, PageNumber, Paragraph, ShadingType, Table, TableCell,
  TableOfContents, TableRow, TextRun, WidthType,
} from 'docx';
import { marked } from 'marked';
import { chromium } from 'playwright-core';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const dirManual = path.resolve(aqui, '..');
const dirSalida = path.join(dirManual, 'entregables');
mkdirSync(dirSalida, { recursive: true });

// ---------- Qué documento se genera ----------
//   node generar.mjs            el manual (Word y PDF)
//   node generar.mjs insumos    los insumos para el documento maestro (solo Word, T12, ADR 0020)
const DOCUMENTOS = {
  manual: {
    titulo: 'Manual técnico y de usuario de RecargaMIO',
    archivo: 'Manual_RecargaMIO',
    pie: 'Manual',
    pdf: true,
    capitulos: [
      { archivo: path.join(dirManual, '01-instalacion-y-operacion.md') },
      { archivo: path.join(dirManual, '02-arquitectura.md') },
      { archivo: path.join(dirManual, '03-manual-de-usuario.md') },
      { archivo: path.join(dirManual, '04-pruebas-y-resultados.md') },
      { archivo: path.join(dirManual, '05-validacion-trl5.md') },
      { archivo: path.resolve(dirManual, '../sprints/bitacora.md'), prefijo: 'Anexo A. ' },
    ],
  },
  insumos: {
    titulo: 'Insumos para el documento maestro de RecargaMIO',
    archivo: 'Insumos_documento_maestro',
    pie: 'Insumos',
    pdf: false,
    capitulos: [{ archivo: path.resolve(dirManual, '../entrega/insumos-documento-maestro.md') }],
  },
};
const DOCUMENTO = DOCUMENTOS[process.argv[2] ?? 'manual'];
if (!DOCUMENTO) throw new Error(`Documento desconocido: ${process.argv[2]}. Opciones: ${Object.keys(DOCUMENTOS).join(', ')}`);

// ---------- Datos de la portada ----------
// Orden y textos según la portada de la guía metodológica del documento maestro (UNAD)
const PORTADA = {
  titulo: DOCUMENTO.titulo,
  subtitulo: 'App móvil RecargaMIO: prototipo para la recarga digital y la gestión de tarjetas del sistema MIO en Santiago de Cali',
  integrantes: ['Viviana Andrea Andrade Torres', 'Jose Luis Mina Cuero', 'Julian Andres Ospina Roncancio'],
  curso: '202016907 - Proyecto de grado',
  tutor: 'Daniel Andrés Guzmán Arevalo',
  programa: 'Programa de Ingeniería de Sistemas',
  escuela: 'Escuela de Ciencias Básicas Tecnología e Ingeniería',
  institucion: 'Universidad Nacional Abierta y a Distancia',
};
const fecha = new Date();
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const fechaTexto = `${fecha.getDate()} de ${MESES[fecha.getMonth()]} de ${fecha.getFullYear()}`;

// ---------- Fuentes ----------
const CAPITULOS = DOCUMENTO.capitulos;

// ---------- Lectura y numeración común a Word y PDF ----------
const decodificar = (t = '') =>
  t.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const textoPlano = (tokens = []) =>
  tokens.map((t) => (t.tokens ? textoPlano(t.tokens) : decodificar(t.text ?? ''))).join('');

/**
 * Inserta otro Markdown donde aparece <!-- incluir: ruta -->. Se usa para docs/metricas/resultados.md,
 * que genera «npm run metricas»: se le quita el título principal y sus títulos bajan un nivel.
 */
function leerConInclusiones(archivo) {
  return readFileSync(archivo, 'utf8').replace(/<!--\s*incluir:\s*(.+?)\s*-->/g, (_, ruta) => {
    const incluido = path.resolve(path.dirname(archivo), ruta);
    if (!existsSync(incluido)) return `> Todavía no hay resultados: corre \`npm run pruebas\` (falta ${ruta}).`;
    return readFileSync(incluido, 'utf8')
      .replace(/^<!-- Archivo generado.*-->\n/m, '')
      .replace(/^# .*\n/m, '')
      .replace(/^(#{1,5}) /gm, '#$1 ');
  });
}

/** Recorre los capítulos y anota en cada token su número de figura o tabla y su título. */
function prepararCapitulos() {
  let figuras = 0;
  let tablas = 0;
  const listaFiguras = [];
  const listaTablas = [];
  const capitulos = CAPITULOS.map(({ archivo, prefijo = '' }) => {
    const tokens = marked.lexer(leerConInclusiones(archivo));
    let ultimoTitulo = '';
    let tituloExplicito = '';
    for (const token of tokens) {
      // Título APA propio para la siguiente tabla: <!-- tabla: Variables de entorno -->
      const comentario = token.type === 'html' && /<!--\s*tabla:\s*(.+?)\s*-->/.exec(token.text);
      if (comentario) tituloExplicito = comentario[1];
      if (token.type === 'heading') {
        if (token.depth === 1 && prefijo) token.text = prefijo + token.text;
        ultimoTitulo = token.depth === 1 ? token.text : textoPlano(token.tokens);
        if (token.depth === 1) token.tokens = marked.Lexer.lexInline(token.text);
      }
      if (token.type === 'paragraph' && token.tokens.length === 1 && token.tokens[0].type === 'image') {
        token.figura = { numero: ++figuras, titulo: decodificar(token.tokens[0].text), ruta: path.resolve(path.dirname(archivo), token.tokens[0].href) };
        listaFiguras.push(token.figura);
      }
      if (token.type === 'table') {
        token.tabla = { numero: ++tablas, titulo: tituloExplicito || ultimoTitulo };
        listaTablas.push(token.tabla);
        tituloExplicito = '';
      }
    }
    return tokens;
  });
  return { capitulos, listaFiguras, listaTablas };
}

// =====================================================================
// WORD
// =====================================================================
const FUENTE = 'Times New Roman';
const ANCHO_UTIL = 12240 - 2 * 1440; // carta con márgenes de 1 pulgada (DXA)
const DOBLE = { line: 480, before: 0, after: 0 };
const SENCILLO = { line: 240, before: 0, after: 0 };

function tamanoPng(ruta) {
  const b = readFileSync(ruta);
  return { ancho: b.readUInt32BE(16), alto: b.readUInt32BE(20), datos: b };
}

function corridas(tokens = [], estilo = {}) {
  const salida = [];
  for (const t of tokens) {
    switch (t.type) {
      case 'strong': salida.push(...corridas(t.tokens, { ...estilo, bold: true })); break;
      case 'em': salida.push(...corridas(t.tokens, { ...estilo, italics: true })); break;
      case 'codespan':
        salida.push(new TextRun({ ...estilo, text: decodificar(t.text), font: 'Courier New', size: 20, shading: { type: ShadingType.CLEAR, fill: 'EEF1F6', color: 'auto' } }));
        break;
      case 'link':
        salida.push(new ExternalHyperlink({ link: t.href, children: corridas(t.tokens, { ...estilo, style: 'Hyperlink' }) }));
        break;
      case 'br': salida.push(new TextRun({ break: 1 })); break;
      case 'html': break;
      case 'text':
        if (t.tokens) salida.push(...corridas(t.tokens, estilo));
        else salida.push(new TextRun({ ...estilo, text: decodificar(t.text) }));
        break;
      default: salida.push(new TextRun({ ...estilo, text: decodificar(t.text ?? t.raw ?? '') }));
    }
  }
  return salida;
}

let instanciaLista = 0;
function lista(token, nivel = 0) {
  const instancia = ++instanciaLista;
  const parrafos = [];
  for (const item of token.items) {
    let primero = true;
    for (const sub of item.tokens) {
      if (sub.type === 'list') {
        parrafos.push(...lista(sub, nivel + 1));
        continue;
      }
      const inline = sub.tokens ?? [{ type: 'text', text: sub.text ?? '' }];
      parrafos.push(new Paragraph({
        children: corridas(inline),
        spacing: { line: 360, before: 0, after: 60 },
        ...(primero
          ? { numbering: { reference: token.ordered ? 'numerada' : 'vinetas', level: nivel, instance: token.ordered ? instancia : undefined } }
          : { indent: { left: 720 * (nivel + 1) } }),
      }));
      primero = false;
    }
  }
  return parrafos;
}

function tablaWord(token) {
  const columnas = token.header.length;
  const pesos = token.header.map((h, i) =>
    Math.max(textoPlano(h.tokens).length, ...token.rows.map((r) => Math.min(textoPlano(r[i].tokens).length, 60)), 6));
  const total = pesos.reduce((a, b) => a + b, 0);
  const anchos = pesos.map((p) => Math.floor((p / total) * ANCHO_UTIL));
  anchos[columnas - 1] += ANCHO_UTIL - anchos.reduce((a, b) => a + b, 0);
  const borde = { style: BorderStyle.SINGLE, size: 4, color: 'C7CEDB' };
  const celda = (contenido, i, encabezado) => new TableCell({
    width: { size: anchos[i], type: WidthType.DXA },
    shading: encabezado ? { type: ShadingType.CLEAR, fill: 'E6EDFA', color: 'auto' } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    borders: { top: borde, bottom: borde, left: borde, right: borde },
    children: [new Paragraph({ spacing: SENCILLO, children: corridas(contenido.tokens, { size: 20, bold: encabezado || undefined }) })],
  });
  return [
    new Paragraph({ spacing: { ...DOBLE, before: 240 }, keepNext: true, children: [new TextRun({ text: `Tabla ${token.tabla.numero}`, bold: true })] }),
    new Paragraph({ spacing: { ...DOBLE, after: 120 }, keepNext: true, children: [new TextRun({ text: token.tabla.titulo, italics: true })] }),
    new Table({
      width: { size: ANCHO_UTIL, type: WidthType.DXA },
      columnWidths: anchos,
      rows: [
        new TableRow({ tableHeader: true, children: token.header.map((h, i) => celda(h, i, true)) }),
        ...token.rows.map((fila) => new TableRow({ cantSplit: true, children: fila.map((c, i) => celda(c, i, false)) })),
      ],
    }),
    new Paragraph({ spacing: { before: 0, after: 240 }, children: [] }),
  ];
}

function figuraWord({ numero, titulo, ruta }) {
  const { ancho, alto, datos } = tamanoPng(ruta);
  const esTelefono = alto > ancho;
  const maxAncho = 576; // 6 pulgadas a 96 ppp
  const maxAlto = esTelefono ? 470 : 560;
  const escala = Math.min(maxAncho / ancho, maxAlto / alto, 1);
  return [
    new Paragraph({ spacing: { ...DOBLE, before: 240 }, keepNext: true, children: [new TextRun({ text: `Figura ${numero}`, bold: true })] }),
    new Paragraph({ spacing: DOBLE, keepNext: true, children: [new TextRun({ text: titulo, italics: true })] }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 60, after: 240 },
      children: [new ImageRun({ type: 'png', data: datos, transformation: { width: Math.round(ancho * escala), height: Math.round(alto * escala) }, altText: { title: `Figura ${numero}`, description: titulo, name: path.basename(ruta) } })],
    }),
  ];
}

function bloquesWord(tokens) {
  const salida = [];
  for (const t of tokens) {
    switch (t.type) {
      case 'heading': {
        const nivel = [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3, HeadingLevel.HEADING_4][t.depth - 1];
        salida.push(new Paragraph({ heading: nivel, pageBreakBefore: t.depth === 1, children: corridas(t.tokens) }));
        break;
      }
      case 'paragraph':
        if (t.figura) salida.push(...figuraWord(t.figura));
        else salida.push(new Paragraph({ spacing: DOBLE, indent: { firstLine: 720 }, children: corridas(t.tokens) }));
        break;
      case 'list': salida.push(...lista(t)); break;
      case 'table': salida.push(...tablaWord(t)); break;
      case 'code':
        for (const [i, linea] of t.text.split('\n').entries()) {
          salida.push(new Paragraph({
            spacing: { line: 240, before: i === 0 ? 120 : 0, after: 0 },
            shading: { type: ShadingType.CLEAR, fill: 'F4F6FA', color: 'auto' },
            indent: { left: 240, right: 240 },
            keepLines: true,
            children: [new TextRun({ text: linea || ' ', font: 'Courier New', size: 18 })],
          }));
        }
        salida.push(new Paragraph({ spacing: { before: 0, after: 200 }, children: [] }));
        break;
      case 'blockquote':
        for (const sub of t.tokens) {
          if (sub.type !== 'paragraph') continue;
          salida.push(new Paragraph({
            spacing: { line: 300, before: 120, after: 200 },
            shading: { type: ShadingType.CLEAR, fill: 'E3F0FC', color: 'auto' },
            border: { left: { style: BorderStyle.SINGLE, size: 18, color: '1565C0', space: 8 } },
            indent: { left: 240, right: 240 },
            children: corridas(sub.tokens, { size: 22 }),
          }));
        }
        break;
      case 'hr': break;
      case 'space': break;
      default: break;
    }
  }
  return salida;
}

function portadaWord() {
  const centrado = (texto, opciones = {}) =>
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: DOBLE, children: [new TextRun({ text: texto, ...opciones })] });
  return [
    new Paragraph({ spacing: { before: 2400 }, children: [] }),
    centrado(PORTADA.titulo, { bold: true, size: 32 }),
    centrado(PORTADA.subtitulo, { size: 24 }),
    new Paragraph({ spacing: DOBLE, children: [] }),
    ...PORTADA.integrantes.map((n) => centrado(n)),
    centrado(PORTADA.curso),
    centrado(`Tutor: ${PORTADA.tutor}`),
    new Paragraph({ spacing: DOBLE, children: [] }),
    centrado(PORTADA.programa),
    centrado(PORTADA.escuela),
    centrado(PORTADA.institucion),
    centrado(fechaTexto),
    new Paragraph({ spacing: DOBLE, children: [] }),
    centrado('Prototipo académico · Pagos en modo de pruebas, sin dinero real', { italics: true, size: 20, color: '5B6475' }),
    new Paragraph({ children: [new PageBreak()] }),
  ];
}

function listaWord(titulo, elementos, etiqueta) {
  return [
    new Paragraph({ children: [new PageBreak()] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: DOBLE, children: [new TextRun({ text: titulo, bold: true })] }),
    ...elementos.map((e) => new Paragraph({
      spacing: { line: 360, before: 0, after: 60 },
      indent: { left: 720, hanging: 720 },
      children: [new TextRun({ text: `${etiqueta} ${e.numero}`, bold: true }), new TextRun({ text: `  ${e.titulo}`, italics: true })],
    })),
  ];
}

async function generarWord({ capitulos, listaFiguras, listaTablas }) {
  const encabezado = (tamano, extra = {}) => ({
    run: { font: FUENTE, size: tamano, bold: true, color: '000000', ...extra },
    paragraph: { spacing: { before: 240, after: 240, line: 480 }, keepNext: true, keepLines: true },
  });
  const documento = new Document({
    creator: 'Equipo RecargaMIO · UNAD',
    title: PORTADA.titulo,
    description: PORTADA.subtitulo,
    features: { updateFields: true },
    styles: {
      default: {
        document: { run: { font: FUENTE, size: 24 }, paragraph: { spacing: DOBLE } },
        heading1: { ...encabezado(28), paragraph: { ...encabezado(28).paragraph, alignment: AlignmentType.CENTER } },
        heading2: encabezado(24),
        heading3: encabezado(24, { italics: true }),
        heading4: encabezado(24, { italics: true, bold: false }),
      },
      characterStyles: [{ id: 'Hyperlink', name: 'Hyperlink', basedOn: 'DefaultParagraphFont', run: { color: '0B3D91', underline: {} } }],
    },
    numbering: {
      config: [
        {
          reference: 'vinetas',
          levels: [0, 1, 2].map((nivel) => ({
            level: nivel, format: LevelFormat.BULLET, text: ['•', '◦', '▪'][nivel], alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720 * (nivel + 1), hanging: 360 } } },
          })),
        },
        {
          reference: 'numerada',
          levels: [0, 1, 2].map((nivel) => ({
            level: nivel, format: [LevelFormat.DECIMAL, LevelFormat.LOWER_LETTER, LevelFormat.LOWER_ROMAN][nivel], text: `%${nivel + 1}.`,
            alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720 * (nivel + 1), hanging: 360 } } },
          })),
        },
      ],
    },
    sections: [{
      properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } },
      headers: {
        default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, spacing: SENCILLO, children: [new TextRun({ children: [PageNumber.CURRENT] })] })] }),
      },
      footers: {
        default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: SENCILLO, children: [new TextRun({ text: `RecargaMIO · ${DOCUMENTO.pie} generado el ${fechaTexto}`, size: 16, color: '6F7889' })] })] }),
      },
      children: [
        ...portadaWord(),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: DOBLE, children: [new TextRun({ text: 'Tabla de contenido', bold: true })] }),
        new TableOfContents('Tabla de contenido', { hyperlink: true, headingStyleRange: '1-2' }),
        new Paragraph({ spacing: { before: 240 }, children: [new TextRun({ text: 'Si la tabla aparece vacía, haz clic derecho sobre ella y elige «Actualizar campos».', italics: true, size: 18, color: '6F7889' })] }),
        ...listaWord('Lista de tablas', listaTablas, 'Tabla'),
        ...listaWord('Lista de figuras', listaFiguras, 'Figura'),
        ...capitulos.flatMap(bloquesWord),
      ],
    }],
  });
  const archivo = path.join(dirSalida, `${DOCUMENTO.archivo}.docx`);
  writeFileSync(archivo, await Packer.toBuffer(documento));
  return archivo;
}

// =====================================================================
// PDF (HTML impreso con Google Chrome)
// =====================================================================
function htmlCapitulos(capitulos) {
  const indice = [];
  let seccion = 0;
  const cuerpo = capitulos.map((tokens) => {
    const transformados = tokens.map((t) => {
      if (t.type === 'heading') {
        const id = `s-${++seccion}`;
        if (t.depth <= 2) indice.push({ id, nivel: t.depth, texto: textoPlano(t.tokens) });
        return { type: 'html', block: true, raw: '', text: `<h${t.depth} id="${id}">${marked.parseInline(t.text)}</h${t.depth}>\n` };
      }
      if (t.figura) {
        const { numero, titulo, ruta } = t.figura;
        return { type: 'html', block: true, raw: '', text: `<figure><p class="etiqueta">Figura ${numero}</p><p class="titulo">${titulo}</p><img src="${pathToFileURL(ruta).href}" alt="${titulo}" class="${tamanoPng(ruta).alto > tamanoPng(ruta).ancho ? 'telefono' : ''}"></figure>\n` };
      }
      return t;
    });
    // Rótulo APA antes de cada tabla
    const conRotulos = transformados.flatMap((t) =>
      t.type === 'table'
        ? [{ type: 'html', block: true, raw: '', text: `<p class="etiqueta">Tabla ${t.tabla.numero}</p><p class="titulo">${t.tabla.titulo}</p>\n` }, t]
        : [t]);
    conRotulos.links = tokens.links ?? {};
    return `<section class="capitulo">${marked.parser(conRotulos)}</section>`;
  }).join('\n');
  return { cuerpo, indice };
}

async function generarPdf({ capitulos, listaFiguras, listaTablas }) {
  const listaHtml = (titulo, elementos, etiqueta) =>
    `<nav class="indice"><h2>${titulo}</h2><ol class="lista">${elementos.map((e) => `<li><strong>${etiqueta} ${e.numero}</strong> <em>${e.titulo}</em></li>`).join('')}</ol></nav>`;
  const { cuerpo, indice } = htmlCapitulos(capitulos);
  const html = `<!doctype html><html lang="es-CO"><head><meta charset="utf-8"><title>${PORTADA.titulo}</title><style>
    @page { size: Letter; margin: 2.54cm; }
    body { font-family: "Times New Roman", Times, serif; font-size: 12pt; line-height: 2; color: #000; }
    .portada { text-align: center; page-break-after: always; padding-top: 5cm; }
    .portada h1 { font-size: 16pt; margin: 0 0 .5em; } .portada .nota { font-style: italic; font-size: 10pt; color: #5B6475; margin-top: 2em; }
    .indice { page-break-after: always; } .indice h2 { text-align: center; } .indice a { color: #000; text-decoration: none; }
    .indice ol { list-style: none; padding: 0; } .indice li.n2 { padding-left: 1.27cm; line-height: 1.6; }
    .lista li { line-height: 1.5; margin-bottom: .3em; padding-left: 1.27cm; text-indent: -1.27cm; }
    .capitulo { page-break-before: always; }
    h1 { font-size: 14pt; text-align: center; } h2, h3, h4 { font-size: 12pt; } h3 { font-style: italic; }
    h1, h2, h3 { page-break-after: avoid; break-after: avoid; }
    p { margin: 0 0 .4em; } .capitulo > p { text-indent: 1.27cm; }
    li { line-height: 1.6; }
    code { font-family: "Courier New", monospace; font-size: 10pt; background: #EEF1F6; padding: 0 .2em; }
    pre { background: #F4F6FA; padding: .6em .8em; line-height: 1.3; white-space: pre-wrap; font-size: 9pt; page-break-inside: avoid; }
    pre code { background: none; padding: 0; }
    blockquote { margin: .8em 0; padding: .4em .8em; background: #E3F0FC; border-left: 4px solid #1565C0; line-height: 1.5; font-size: 11pt; page-break-inside: avoid; }
    table { width: 100%; border-collapse: collapse; font-size: 10pt; line-height: 1.35; margin: .3em 0 1.2em; }
    thead { display: table-header-group; } tr { page-break-inside: avoid; }
    th, td { border: 1px solid #C7CEDB; padding: .3em .45em; text-align: left; vertical-align: top; } th { background: #E6EDFA; }
    .etiqueta { font-weight: bold; margin: 1em 0 0; text-indent: 0 !important; page-break-after: avoid; }
    .titulo { font-style: italic; margin: 0 0 .4em; text-indent: 0 !important; page-break-after: avoid; }
    figure { margin: 0 0 1em; page-break-inside: avoid; } figure img { display: block; margin: .3em auto; max-width: 100%; max-height: 16cm; }
    figure img.telefono { max-height: 13cm; }
    a { color: #0B3D91; }
  </style></head><body>
    <div class="portada">
      <h1>${PORTADA.titulo}</h1><p>${PORTADA.subtitulo}</p><br>
      ${PORTADA.integrantes.map((n) => `<p>${n}</p>`).join('')}
      <p>${PORTADA.curso}</p><p>Tutor: ${PORTADA.tutor}</p><br>
      <p>${PORTADA.programa}</p><p>${PORTADA.escuela}</p><p>${PORTADA.institucion}</p><p>${fechaTexto}</p>
      <p class="nota">Prototipo académico · Pagos en modo de pruebas, sin dinero real</p>
    </div>
    <nav class="indice"><h2>Tabla de contenido</h2><ol>
      ${indice.map((e) => `<li class="n${e.nivel}"><a href="#${e.id}">${e.texto}</a></li>`).join('')}
    </ol></nav>
    ${listaHtml('Lista de tablas', listaTablas, 'Tabla')}
    ${listaHtml('Lista de figuras', listaFiguras, 'Figura')}
    ${cuerpo}
  </body></html>`;
  const archivoHtml = path.join(dirSalida, 'manual.html');
  writeFileSync(archivoHtml, html);

  const navegador = await chromium.launch({ channel: 'chrome' });
  const pagina = await navegador.newPage();
  await pagina.goto(pathToFileURL(archivoHtml).href, { waitUntil: 'load' });
  const archivo = path.join(dirSalida, `${DOCUMENTO.archivo}.pdf`);
  await pagina.pdf({
    path: archivo,
    format: 'Letter',
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: '<div style="width:100%;font:10pt \'Times New Roman\';text-align:right;padding-right:2.54cm"><span class="pageNumber"></span></div>',
    footerTemplate: `<div style="width:100%;font:7pt Arial;color:#6F7889;text-align:center">RecargaMIO · ${DOCUMENTO.pie} generado el ${fechaTexto}</div>`,
    margin: { top: '2.54cm', bottom: '2.54cm', left: '2.54cm', right: '2.54cm' },
  });
  await navegador.close();
  return archivo;
}

const capitulosWord = prepararCapitulos();
const capitulosPdf = prepararCapitulos();
const word = await generarWord(capitulosWord);
console.log('✔ Word:', path.relative(process.cwd(), word));
if (DOCUMENTO.pdf) {
  const pdf = await generarPdf(capitulosPdf);
  console.log('✔ PDF: ', path.relative(process.cwd(), pdf));
}
