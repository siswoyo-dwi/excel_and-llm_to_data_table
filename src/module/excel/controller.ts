import ExcelJS from 'exceljs';
import { Document } from '@langchain/core/documents';

import { getExistingTablesAndColumns, getMessageText, extractInsertSQL } from "../../convert/table";
import { ChatOpenAI } from "@langchain/openai";
import { Request, Response } from 'express';
import path from 'path';
import { sq } from "../../config/connection";
const model = new ChatOpenAI({
    temperature: 0,
    model: "gpt-4o",
});

interface UploadedFiles {
    [fieldname: string]: Express.Multer.File[];
}

export class Controller {
    static async convert(req: Request & { files?: UploadedFiles }, res: Response) {
        try {
            if (!req.files || !req.files.file1) {
                return res.status(400).json({ error: "No file uploaded" });
            }

            const uploadedFile = req.files.file1[0];
            const filePath = path.join('./asset/file/', uploadedFile.filename);

            // Process Excel file
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.readFile(filePath);
            
            // Get first worksheet
            const worksheet = workbook.worksheets[0];
            
            // Extract headers
            const headerRow = worksheet.getRow(1);
            const headers = headerRow.values.slice(1).map(String); // Skip first empty value

            // Extract data rows
            const rows = [];
            worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
                if (rowNumber === 1) return; // Skip header row
                
                const rowData = {};
                row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                    rowData[headers[colNumber-1]] = cell.value;
                });
                rows.push(rowData);
            });

            // Format data for LLM
            const formattedData = rows.map(row => 
                headers.map(header => `${header}: ${row[header] || ''}`).join(', ')
            ).join('\n');

            const tableMap = await getExistingTablesAndColumns();
            const tableSchemaString = Object.entries(tableMap)
                .map(([table, cols]) => {
                    const colStr = cols.map(c => `${c.column} (${c.type})`).join(", ");
                    return `- ${table}: ${colStr}`;
                }).join("\n");

            // Improved prompt with specific instructions
            const checkPrompt = `
            Data dari Excel:
            Kolom: ${headers.join(', ')}
            
            Contoh Data:
            ${formattedData.slice(0, 1500)}

            Tabel yang tersedia:
            ${tableSchemaString}

            Instruksi:
            1. Cocokkan kolom Excel dengan kolom tabel yang tersedia
            2. Buat query INSERT SQL untuk semua data
            3. Format nilai sesuai tipe kolom (string dalam quotes, tanggal dalam format SQL, dll)
            4. Jika tidak ada tabel yang cocok, kembalikan error

            Contoh format yang diharapkan:
            INSERT INTO nama_tabel (col1, col2) VALUES 
            ('val1', 'val2'),
            ('val3', 'val4');
            `;

            const checkRes = await model.invoke(checkPrompt);
            const checkOutput = getMessageText(checkRes).trim();
            const insertSQL = extractInsertSQL(checkOutput);

            if (!insertSQL) {
                return res.status(400).json({ error: "No valid INSERT SQL generated" });
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
            console.error("Error in convert:", err);
            return res.status(500).json({ 
                error: "Internal server error",
                details: err.message 
            });
        }
    }
}