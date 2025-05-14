import { sq } from "../config/connection";
async function getExistingTablesAndColumns() {
  try {
    const result = await sq.query(`
      SELECT table_name, column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position;
    `);
        
    if (!result) {
      throw new Error('Query returned no results');
    }

    const tableMap: Record<string, { column: string, type: string }[]> = {};
    result[0].forEach(row=> {      
      if (!tableMap[row.table_name]) tableMap[row.table_name] = [];
      tableMap[row.table_name].push({ 
        column: row.column_name, 
        type: row.data_type 
      });
    });

    return tableMap;
  } catch (error) {
    console.error('Error in getExistingTablesAndColumns:', error);
    throw error; // Re-throw error untuk ditangkap oleh caller
  }
}
const getMessageText = (msg: any): string => {
  if (typeof msg === "string") return msg;
  if (msg?.content && typeof msg.content === "string") return msg.content;
  if (msg?.content && Array.isArray(msg.content)) {
    return msg.content.map((c: any) => (typeof c === "string" ? c : c.text || "")).join(" ");
  }
  return "";
};
function extractInsertSQL(text: string): string | null {  
  // Mencari bagian yang diapit oleh ```sql ... ```
  const sqlBlockRegex = /```sql([\s\S]*?)```/;
  const match = text.match(sqlBlockRegex);
  
  if (match && match[1]) {
    return match[1].trim();
  }
  
  // Jika tidak ditemukan block ```sql, cari INSERT statement langsung
  const insertRegex = /INSERT INTO[\s\S]*?(?=;|$)/i;
  const insertMatch = text.match(insertRegex);
  
  return insertMatch ? insertMatch[0].trim() + ";" : null;
}


export {getExistingTablesAndColumns,getMessageText,extractInsertSQL}