import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { getExistingTablesAndColumns, getMessageText, extractInsertSQL } from "../../convert/table";
import { ChatOpenAI } from "@langchain/openai";
import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { sq } from "../../config/connection";

const model = new ChatOpenAI({
  temperature: 0,
  model: "gpt-4o",
});

export class Controller {
    static async convert(req: Request & { files?: any }, res: Response) {
      try {
        // 1. Check if files were uploaded
        console.log(req.files);
        
        if (!req.files || !req.files.file1) {
          return res.status(400).json({ error: "No file uploaded" });
        }

        // 2. Get the file path
        const uploadedFile = req.files.file1[0];
        const filePath = path.join('./asset/file/', uploadedFile.filename);

        // 3. Process the PDF
        const loader = new PDFLoader(filePath);
        const docs = await loader.load();

        // Extract and format text from PDF
        const pdfText = docs.map(doc => doc.pageContent).join("\n");

        // 4. Get existing tables schema
        const tableMap = await getExistingTablesAndColumns();
        const tableSchemaString = Object.entries(tableMap)
          .map(([table, cols]) => {
            const colStr = cols.map(c => `${c.column} (${c.type})`).join(", ");
            return `- ${table}: ${colStr}`;
          }).join("\n");

        // 5. Create prompt for LLM
        const checkPrompt = `
        Data dari PDF:
        \`\`\`
        ${pdfText.slice(0, 1500)}
        \`\`\`

        Tabel yang tersedia:
        \`\`\`
        ${tableSchemaString}
        \`\`\`

        Instruksi:
        1. Identifikasi data tabular dalam teks PDF
        2. Cocokkan dengan struktur tabel yang ada
        3. Buat query INSERT SQL untuk data yang ditemukan
        4. Format nilai sesuai tipe kolom:
           - String: dalam quotes
           - Number: tanpa quotes
           - Boolean: true/false
           - Null: NULL
        5. Jika tidak ada tabel yang cocok, sarankan CREATE TABLE

        Contoh output:
        INSERT INTO risk_controls 
        (control_id, domain, description, applicable_to, status, risk_rating)
        VALUES 
        ('RMiT-001', 'Incident Response', 'Incident Response item 1', 'General Insurance', 'In Progress', 'Medium');
        `;

        const checkRes = await model.invoke(checkPrompt);
        const checkOutput = getMessageText(checkRes).trim();
        console.log("LLM Response:\n", checkOutput);
        
        const insertSQL = extractInsertSQL(checkOutput);
        if (!insertSQL) {
          return res.status(400).json({ error: "No INSERT SQL generated from PDF" });
        }

           await sq.query(insertSQL)
                .then(() => res.json({ status: 200, message: 'Data berhasil diinput'}))
                .catch(err => res.status(500).json({ 
                    status: 500, 
                    message: 'Error input data', 
                    error: err.message,
                }));
      } catch (err) {
        console.error("Error in PDF convert:", err);
        return res.status(500).json({ 
          error: "Error processing PDF file",
          details: err instanceof Error ? err.message : String(err)
        });
      } finally {
        // Clean up uploaded file
        if (req.files?.file1) {
          fs.unlinkSync(path.join('./asset/file/', req.files.file1[0].filename));
        }
      }
    }
}