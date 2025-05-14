import { CSVLoader } from "@langchain/community/document_loaders/fs/csv";
import { getExistingTablesAndColumns,getMessageText,extractInsertSQL } from "../../convert/table";
import { ChatOpenAI } from "@langchain/openai";
import  { Request, Response } from 'express';

const model = new ChatOpenAI({
  temperature: 0,
  model: "gpt-4o",
});


export class Controller {
    static async convert(req:Request,res:Response) {
      try {
        let filePath = ''
            if(req.files){
                if(req.files.file1){
                     filePath = './asset/file/' + req.files.file1[0].filename
                }
            }
        const loader = new CSVLoader(filePath);
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
        const checkRes = await model.invoke(checkPrompt);
        const checkOutput = getMessageText(checkRes).trim();
        console.log("LLM Response:\n", checkOutput);                 
        const insertSQL = extractInsertSQL(checkOutput);
        if (!insertSQL) {
          console.error("Tidak ditemukan SQL INSERT di respons LLM.");
          return;
        }
    
            return insertSQL
        } catch (err) {
            return "Terjadi error:"+ err
        } finally {
      }
    }
}

