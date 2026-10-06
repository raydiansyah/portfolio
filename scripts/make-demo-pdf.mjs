#!/usr/bin/env node
/**
 * Generates public/demo-slides/web-performance.pdf — a dependency-free,
 * hand-assembled 5-page PDF (16:9, 960x540 pt, Helvetica) used by the mock
 * slide portal. Run once: `node scripts/make-demo-pdf.mjs`.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../public/demo-slides/web-performance.pdf')
const W = 960
const H = 540

const PAGES = [
  { title: 'Kenapa performa', body: 'Halaman lambat menurunkan konversi, SEO, dan kepercayaan pengguna.' },
  { title: 'LCP', body: 'Largest Contentful Paint: elemen terbesar tampil di bawah 2,5 detik.' },
  { title: 'CLS', body: 'Cumulative Layout Shift: tata letak stabil, skor di bawah 0,1.' },
  { title: 'INP', body: 'Interaction to Next Paint: respons interaksi di bawah 200 ms.' },
  { title: 'Checklist', body: 'Ukur, optimalkan gambar, tunda JS, cadangkan ruang, uji ulang.' },
]

/** Escape a string for a PDF literal; content is ASCII-only by design. */
const lit = (s) => `(${s.replace(/[\\()]/g, (c) => `\\${c}`)})`

function pageContent({ title, body }, i) {
  return [
    // Warm paper background + accent rule
    '0.97 0.96 0.94 rg', `0 0 ${W} ${H} re f`,
    '0.13 0.38 0.52 rg', `72 380 64 4 re f`,
    // Kicker
    'BT /F1 14 Tf 0.4 0.42 0.45 rg', `72 410 Td ${lit(`WORKSHOP WEB PERFORMANCE  -  ${i + 1} / ${PAGES.length}`)} Tj ET`,
    // Title
    'BT /F2 56 Tf 0.08 0.1 0.12 rg', `72 300 Td ${lit(title)} Tj ET`,
    // Body
    'BT /F1 22 Tf 0.25 0.28 0.31 rg', `72 240 Td ${lit(body)} Tj ET`,
    // Footer
    'BT /F1 12 Tf 0.5 0.52 0.55 rg', `72 48 Td ${lit('Ray Diansyah')} Tj ET`,
  ].join('\n')
}

// Object layout: 1 catalog, 2 pages, 3 F1, 4 F2, then (page, content) pairs.
const objects = []
const kids = PAGES.map((_, i) => `${5 + i * 2} 0 R`).join(' ')
objects[1] = '<< /Type /Catalog /Pages 2 0 R >>'
objects[2] = `<< /Type /Pages /Kids [${kids}] /Count ${PAGES.length} >>`
objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'
objects[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>'
PAGES.forEach((p, i) => {
  const pageId = 5 + i * 2
  const stream = pageContent(p, i)
  objects[pageId] =
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] ` +
    `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${pageId + 1} 0 R >>`
  objects[pageId + 1] = `<< /Length ${Buffer.byteLength(stream, 'latin1')} >>\nstream\n${stream}\nendstream`
})

// Serialize with exact byte offsets for the xref table.
let pdf = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n'
const offsets = [0]
for (let id = 1; id < objects.length; id++) {
  offsets[id] = Buffer.byteLength(pdf, 'latin1')
  pdf += `${id} 0 obj\n${objects[id]}\nendobj\n`
}
const xrefAt = Buffer.byteLength(pdf, 'latin1')
pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`
for (let id = 1; id < objects.length; id++) pdf += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`
pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`

mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(OUT, Buffer.from(pdf, 'latin1'))
console.log(`wrote ${OUT} (${PAGES.length} pages, ${Buffer.byteLength(pdf, 'latin1')} bytes)`)
