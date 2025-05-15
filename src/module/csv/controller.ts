import { CSVLoader } from "@langchain/community/document_loaders/fs/csv";
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
            // 1. Check if files were uploaded
            
            if (!req.files || !req.files.file1) {
                return res.status(400).json({ error: "No file uploaded" });
            }

            // 2. Get the first file
            const uploadedFile = req.files.file1[0];
            const filePath = path.join('./asset/file/', uploadedFile.filename);

            // 3. Process the CSV
            const loader = new CSVLoader(filePath);
            const docs = await loader.load();

            // Rest of your processing logic...
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
            Buat query INSERT untuk menyimpan data dari CSV ke tabel yang sesuai.
            Jika tidak ada yang cocok, kembalikan error.
            `;

            const checkRes = await model.invoke(checkPrompt);
            console.log(checkRes);
            
            const checkOutput = getMessageText(checkRes).trim();

            const insertSQL = extractInsertSQL(checkOutput);
                        console.log("insertSQL:\n", insertSQL);

            if (!insertSQL) {
                return res.status(400).json({ error: "No INSERT SQL generated" });
            }else{
                 await sq.query(insertSQL).then(function () {
                    return res.json({status:200,message:'Sukses Input data'});
                 }).catch(function () {
                    return res.json({status:500,message:'Error Input data'});
                 })
            }

        } catch (err) {
            console.error("Error in convert:", err);
            return res.status(500).json({ error: "Internal server error" });
        }
    }
}