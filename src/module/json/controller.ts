import { getExistingTablesAndColumns, getMessageText, extractInsertSQL } from "../../convert/table";
import { ChatOpenAI } from "@langchain/openai";
import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { sq } from "../../config/connection";

const model = new ChatOpenAI({
  temperature: 0,
  model: "gpt-4o",
});

export class Controller {
  static async convert(req: Request, res: Response) {
    try {
      // 1. Validasi file upload
      console.log(req.files);
      
      if (!req.files || !req.files.file1) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // 2. Dapatkan file path
      const filePath = './asset/file/' + req.files.file1[0].filename;
      const data = fs.readFileSync(filePath, 'utf-8');
      const jsonData = JSON.parse(data);

      // 3. Validasi struktur JSON khusus Anda
      if (!Array.isArray(jsonData) || !jsonData[0]?.rows) {
        throw new Error("Invalid JSON format: Expected array with 'rows' property");
      }

      // 4. Ekstrak data dari format khusus
      const allRows = jsonData.flatMap(page => page.rows);
      const headers = Object.keys(allRows[0]);

      // 5. Format data untuk prompt
      const sampleData = allRows.slice(0, 5).map(row => 
        headers.map(header => `${header}: ${row[header]}`).join(', ')
      ).join('\n');

      // 6. Dapatkan schema tabel
      const tableMap = await getExistingTablesAndColumns();
      const tableSchemaString = Object.entries(tableMap)
        .map(([table, cols]) => `- ${table}: ${cols.map(c => `${c.column} (${c.type})`).join(', ')}`)
        .join('\n');

      // 7. Buat prompt yang lebih spesifik
      const prompt = `
      Data dari JSON:
      Format: Setiap item memiliki properti 'page' dan 'rows' 
      Kolom yang tersedia: ${headers.join(', ')}
      
      Contoh Data:
      ${sampleData}

      Tabel yang tersedia:
      ${tableSchemaString}

      Instruksi:
      1. Buat query INSERT SQL untuk semua data di dalam 'rows'
      2. Gunakan format nilai yang tepat:
         - String: dalam quotes
         - Number: tanpa quotes
         - Boolean: true/false
         - Null: NULL
      3. Sesuaikan nama kolom dengan tabel yang ada
      4. Jika tidak ada tabel yang cocok, sarankan CREATE TABLE

      Contoh output yang diharapkan:
      INSERT INTO risk_controls 
      (control_id, domain, description, applicable_to, status, risk_rating, evidence_link, remarks)
      VALUES 
      ('RMiT-001', 'Incident Response', 'Incident Response control item 1', 'General Insurance', 'In Progress', 'Medium', '/evidence/rmit_001.pdf', 'Needs review'),
      ('RMiT-002', 'Change Management', 'Change Management control item 2', 'Retail Bank', 'In Progress', 'Low', '/evidence/rmit_002.pdf', 'Verified by compliance team');
      `;

      const response = await model.invoke(prompt);
      const output = getMessageText(response);
      const insertSQL = extractInsertSQL(output);

      if (!insertSQL) {
        throw new Error("Tidak dapat menghasilkan query INSERT");
      }

        await sq.query(insertSQL)
                .then(() => res.json({ status: 200, message: 'Data berhasil diinput'}))
                .catch(err => res.status(500).json({ 
                    status: 500, 
                    message: 'Error input data', 
                    error: err.message,
                    generatedSQL: insertSQL 
                }));

    } catch (err) {
      console.error("Error processing JSON:", err);
      return res.status(500).json({
        error: "Error processing JSON file",
        details: err instanceof Error ? err.message : String(err)
      });
    } finally {
      // Cleanup file
      if (req.files?.file1) {
        fs.unlinkSync(path.join('./asset/file/', req.files.file1[0].filename));
      }
    }
  }
}