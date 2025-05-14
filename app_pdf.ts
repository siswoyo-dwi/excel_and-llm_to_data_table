import * as fs from 'fs';
// import * as pdfjsLib from 'pdfjs-dist';
// import * as fs from 'fs';
import { promisify } from 'util';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

// Konfigurasi worker
// pdfjsLib.GlobalWorkerOptions.workerSrc = require.resolve('pdfjs-dist/legacy/build/pdf.worker.js');
// Fungsi khusus untuk ekstraksi tabel dengan pemisahan kolom berdasarkan X
function splitRowByX(row: { text: string, x: number }[], xThreshold = 30): string[] {
  const cells: string[] = [];
  let current = '';
  let lastX = null;

  for (const item of row) {
    if (lastX !== null && Math.abs(item.x - lastX) > xThreshold) {
      cells.push(current.trim());
      current = item.text;
    } else {
      current += ' ' + item.text;
    }
    lastX = item.x;
  }
  if (current) cells.push(current.trim());
  return cells;
}

 async function pdfTableToJson(pdfPath: string): Promise<TableOutput[]> {
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const pdf = await pdfjsLib.getDocument({ data }).promise;

  const tables: TableOutput[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent() as PdfPageContent;

    const items = content.items.map(item => ({
      text: item.str.trim(),
      x: item.transform[4],
      y: Math.round(item.transform[5]),
    })).filter(item => item.text.length > 0);

    // Kelompokkan per baris berdasarkan Y
    const rowsMap: Record<number, { text: string; x: number }[]> = {};
    for (const item of items) {
      rowsMap[item.y] = rowsMap[item.y] || [];
      rowsMap[item.y].push({ text: item.text, x: item.x });
    }

    const sortedRows = Object.entries(rowsMap)
      .sort((a, b) => b[0] - a[0]) // descending Y (top to bottom)
      .map(([, row]) => row.sort((a, b) => a.x - b.x)); // left to right

    if (sortedRows.length < 2) continue;

    // Temukan baris header: baris pertama yang mengandung kata 'Control ID'
    const headerRow = sortedRows.find(row =>
      row.some(cell => /control id/i.test(cell.text))
    );
    if (!headerRow) continue;

    // Ambil headers dan posisi x-nya
    const headers = headerRow.map(h => h.text);
    const headerXs = headerRow.map(h => h.x);

    // Ambil data dari baris setelah header
    const headerIndex = sortedRows.indexOf(headerRow);
    const dataRows = sortedRows.slice(headerIndex + 1);

    const tableData: Record<string, string>[] = [];

for (const row of dataRows) {
  const rowObj: Record<string, string> = {};
  const cellTexts = splitRowByX(row);
  if (cellTexts.length < headers.length) {
    console.warn(`Baris tidak lengkap di halaman ${pageNum}, baris dilewati.`);
    continue;
  }else{
  for (const cell of row) {
    // Temukan header dengan posisi x terdekat
    const closestHeaderIdx = headerXs.reduce((closestIdx, headerX, idx) => {
      return Math.abs(cell.x - headerX) < Math.abs(cell.x - headerXs[closestIdx])
        ? idx
        : closestIdx;
    }, 0);

    const header = headers[closestHeaderIdx];
    if (!rowObj[header]) {
      rowObj[header] = cell.text;
    } else {
      rowObj[header] += ' ' + cell.text;
    }
  }

  tableData.push(rowObj);
  }

}


    tables.push({
      page: pageNum,
      headers,
      rows: tableData
    });
  }

  return tables;
}


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
    for (let i = 0; i < tableData[0].rows.length; i++) {
        console.log(tableData[0].rows[i]);
              
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

main();