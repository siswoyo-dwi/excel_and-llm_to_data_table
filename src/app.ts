import 'dotenv/config';
import { ChatOpenAI } from "@langchain/openai";
import dotenv from "dotenv";
import { CSVLoader } from "@langchain/community/document_loaders/fs/csv";


dotenv.config();

import pkg from 'pg';
const { Pool } = pkg;
const model = new ChatOpenAI({
    temperature: 0,
    model: "gpt-4o",
  });
export const pool = new Pool({
  host: process.env.HOST,
  port:Number(process.env.PORT),
  user: process.env.USER,
  password: process.env.PWD,
  database: process.env.DB,
});
async function getExistingTablesAndColumns() {
  const result = await pool.query(`
    SELECT table_name, column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position;
  `);

  // Bentuk data ke dalam format tabel → kolom[]
  const tableMap: Record<string, { column: string, type: string }[]> = {};
  result.rows.forEach(row => {
    if (!tableMap[row.table_name]) tableMap[row.table_name] = [];
    tableMap[row.table_name].push({ column: row.column_name, type: row.data_type });
  });

  return tableMap;
}
// Ambil teks dari response
const getMessageText = (msg: any): string => {
  if (typeof msg === "string") return msg;
  if (msg?.content && typeof msg.content === "string") return msg.content;
  if (msg?.content && Array.isArray(msg.content)) {
    return msg.content.map((c: any) => (typeof c === "string" ? c : c.text || "")).join(" ");
  }
  return "";
};
function extractInsertSQL(text: string): string | null {
  const match = text.match(/INSERT INTO[\s\S]+?;\s*$/im);
  return match ? match[0].trim() : null;
}

async function main() {
  try {
    const loader = new CSVLoader("./RMiT_Compliance_Benchmark_Data.csv");
    const docs = await loader.load();

    // Ambil semua teks dari CSV
    const csvData = docs.map(doc => doc.pageContent).join("\n");

    const tableMap = await getExistingTablesAndColumns();
    const tableSchemaString = Object.entries(tableMap)
    .map(([table, cols]) => {
        const colStr = cols.map(c => `${c.column} (${c.type})`).join(", ");
        return `- ${table}: ${colStr}`;
    }).join("\n");

    const checkPrompt = `
    CSV Data:
    \`\`\`
    ${csvData.slice(0, 1500)}
    \`\`\`

    Tabel yang tersedia:
    \`\`\`
    ${tableSchemaString}
    \`\`\`

    Pertanyaan:
    Apakah salah satu tabel di atas cocok untuk menyimpan data dari CSV ini? 
    Jika iya, sebutkan nama tabel tersebut dan buat query INSERT-nya.
    Jika tidak ada yang cocok, berikan saran struktur tabel baru (CREATE TABLE).
    `;
// contoh propmp
//  LLM Response:
//  Berdasarkan data CSV yang diberikan, tabel yang paling cocok untuk menyimpan data tersebut adalah tabel `rmit`. Tabel ini 
// memiliki kolom yang sesuai dengan data dari CSV, seperti `control_id`, `domain`, `description`, `applicable_to`, `status`, 
// `risk_rating`, `evidence_link`, dan `remarks`.

// Berikut adalah query `INSERT` untuk memasukkan data dari CSV ke dalam tabel `rmit`:

// ```sql
// INSERT INTO rmit (control_id, domain, description, applicable_to, status, risk_rating, evidence_link, remarks) VALUES      
// ('RMiT-001', 'Incident Response', 'Incident Response control item 1', 'General Insurance', 'In Progress', 'Medium', '/evidence/rmit_001.pdf', 'Needs review'),
// ('RMiT-002', 'Change Management', 'Change Management control item 2', 'Retail Bank', 'In Progress', 'Low', '/evidence/rmit_002.pdf', 'Verified by compliance team'),
// ('RMiT-003', 'Third-Party Risk', 'Third-Party Risk control item 3', 'Digital Bank', 'In Progress', 'Medium', '/evidence/rmit_003.pdf', 'Verified by compliance team'),
// ('RMiT-004', 'IT Asset Management', 'IT Asset Management control item 4', 'Islamic Bank', 'Not Implemented', 'Medium', '/evidence/rmit_004.pdf', 'Needs review'),
// ('RMiT-005', 'IT Asset Management', 'IT Asset Management control item 5', 'Digital Bank', 'Partially Implemented', 'High', 
// '/evidence/rmit_005.pdf', 'Needs review');
// ```

// Jika tabel `rmit` tidak ada atau tidak sesuai, berikut adalah saran struktur tabel baru yang dapat digunakan untuk menyimpan data dari CSV:

// ```sql
// CREATE TABLE rmit_new (
//     id SERIAL PRIMARY KEY,
//     control_id VARCHAR(50),
//     domain VARCHAR(100),
//     description TEXT,
//     applicable_to VARCHAR(100),
//     status VARCHAR(50),
//     risk_rating VARCHAR(50),
//     evidence_link TEXT,
//     remarks TEXT
// );
// ```

// Setelah membuat tabel baru, Anda dapat menggunakan query `INSERT` yang sama dengan mengganti nama tabel `rmit` menjadi `rmit_new`.



//lanjut proses
//     const checkRes = await model.invoke(checkPrompt);
//     const checkOutput = getMessageText(checkRes).trim();
//     console.log("📋 LLM Response:\n", checkOutput);                 
// // Asumsikan checkOutput berisi string SQL valid dari LLM
// const insertSQL = extractInsertSQL(checkOutput);
// if (!insertSQL) {
//   console.error("❌ Tidak ditemukan SQL INSERT di respons LLM.");
//   return;
// }
// console.log(insertSQL);
// contoh insert
// INSERT INTO rmit (control_id, domain, description, applicable_to, status, risk_rating, evidence_link, remarks) VALUES
// ('RMiT-001', 'Incident Response', 'Incident Response control item 1', 'General Insurance', 'In Progress', 'Medium', '/evidence/rmit_001.pdf', 'Needs review'),
// ('RMiT-002', 'Change Management', 'Change Management control item 2', 'Retail Bank', 'In Progress', 'Low', '/evidence/rmit_002.pdf', 'Verified by compliance team'),
// ('RMiT-003', 'Third-Party Risk', 'Third-Party Risk control item 3', 'Digital Bank', 'In Progress', 'Medium', '/evidence/rmit_003.pdf', 'Verified by compliance team'),
// ('RMiT-004', 'IT Asset Management', 'IT Asset Management control item 4', 'Islamic Bank', 'Not Implemented', 'Medium', '/evidence/rmit_004.pdf', 'Needs review'),
// ('RMiT-005', 'IT Asset Management', 'IT Asset Management control item 5', 'Digital Bank', 'Partially Implemented', 'High', 
// '/evidence/rmit_005.pdf', 'Needs review');
//   await pool.query(insertSQL);
        console.log("✅ Semua data berhasil dimasukkan ke database.");
    } catch (err) {
        console.error("❌ Terjadi error:", err);
    } finally {
    await pool.end();
  }
}
main()