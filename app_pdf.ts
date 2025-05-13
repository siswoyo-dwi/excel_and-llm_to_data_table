import * as fs from 'fs';
// import * as pdfjsLib from 'pdfjs-dist';
// import * as fs from 'fs';
import { promisify } from 'util';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

// Konfigurasi worker
// pdfjsLib.GlobalWorkerOptions.workerSrc = require.resolve('pdfjs-dist/legacy/build/pdf.worker.js');

async function extractPdfText(filePath: string): Promise<string> {
  const readFile = promisify(fs.readFile);
  const data = new Uint8Array(await readFile(filePath));

  const pdf = await pdfjsLib.getDocument({
    data,
    standardFontDataUrl: require.resolve('pdfjs-dist/standard_fonts/')
  }).promise;

  let text = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map(item => item.str).join(' ') + '\n';
  }

  return text;
}

// Contoh penggunaan
(async () => {
  try {
    const text = await extractPdfText('./sample_rmit_table.pdf');
    console.log('Extracted text:', text);
  } catch (err) {
    console.error('Error:', err);
  }
})();
// Konfigurasi PDF.js
// pdfjsLib.GlobalWorkerOptions.workerSrc = require('pdfjs-dist/build/pdf.worker.min.js');

interface PdfTextItem {
  str: string;
  transform: number[];
}

interface PdfPageContent {
  items: PdfTextItem[];
}

interface JsonOutput {
  page: number;
  content: string[];
}

interface TableOutput {
  page: number;
  headers: string[];
  rows: Record<string, string>[];
}

// Fungsi utama untuk konversi PDF ke JSON (teks biasa)
export async function pdfToJson(pdfPath: string): Promise<JsonOutput[]> {
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const pdf = await pdfjsLib.getDocument({ data }).promise;

  const results: JsonOutput[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent() as PdfPageContent;

    const texts = content.items
      .map(item => item.str.trim())
      .filter(text => text.length > 0);

    results.push({
      page: i,
      content: texts
    });
  }

  return results;
}

// Fungsi khusus untuk ekstraksi tabel
export async function pdfTableToJson(pdfPath: string): Promise<TableOutput[]> {
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const pdf = await pdfjsLib.getDocument({ data }).promise;

  const tables: TableOutput[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent() as PdfPageContent;

    // Ekstrak teks dengan koordinat
    const items = content.items.map(item => ({
      text: item.str,
      x: item.transform[4],
      y: item.transform[5]
    }));

    // Kelompokkan per baris berdasarkan koordinat Y
    const rows: Record<number, typeof items> = {};
    items.forEach(item => {
      const y = Math.round(item.y);
      rows[y] = rows[y] || [];
      rows[y].push(item);
    });

    // Urutkan baris dan kolom
    const sortedRows = Object.values(rows)
      .sort((a, b) => b[0].y - a[0].y)
      .map(row => row.sort((a, b) => a.x - b.x).map(i => i.text));

    if (sortedRows.length < 2) continue; // Skip jika tidak ada tabel

    const headers = sortedRows[0];
    const tableData = sortedRows.slice(1).map(row => {
      return headers.reduce((obj, header, idx) => {
        obj[header] = row[idx] || '';
        return obj;
      }, {} as Record<string, string>);
    });

    tables.push({
      page: i,
      headers: headers,
      rows: tableData
    });
  }

  return tables;
}

// Contoh penggunaan
async function main() {
  try {
    // Contoh 1: Konversi teks biasa
    const jsonData = await pdfToJson('sample_rmit_table.pdf');
    fs.writeFileSync('output.json', JSON.stringify(jsonData, null, 2));
    console.log(jsonData,'Teks biasa berhasil dikonversi');

    // Contoh 2: Konversi tabel
    const tableData = await pdfTableToJson('sample_rmit_table.pdf');
    fs.writeFileSync('table_output.json', JSON.stringify(tableData, null, 2));
    console.log(tableData,'Tabel berhasil dikonversi');
  } catch (error) {
    console.error('Error:', error);
  }
}

main();