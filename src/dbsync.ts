import { sq } from './config/connection.js'
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    let normalizedPath = path.join(__dirname, "../src/module");
    // console.log(normalizedPath);
    let folder1 = fs.readdirSync(normalizedPath)
    for (let u = 0; u < folder1.length; u++) {
        let normalize = path.join(__dirname, "../src/module/" + folder1[u]);
        let folder2 = fs.readdirSync(normalize)
        for (let i = 0; i < folder2.length; i++) {
            if (folder2[i] == "model.js") {
                // console.log(folder2[i])
                let m = await import(`../src/module/${folder1[u]}/model.js`)
            }
        }

    }

    await sq.sync({ alter: true })
    console.log('Database Berhasil di Sinkronisasi');
    console.log('disconnecting...');
    process.exit(0);
} catch (error) {
    console.log(error)
}