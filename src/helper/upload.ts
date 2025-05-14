import multer from 'multer';
import { Request } from 'express';

// Define the structure of uploaded files
interface UploadedFiles {
    [fieldname: string]: Express.Multer.File[];
}

const storage = multer.diskStorage({
    destination: './asset/file/',
    filename: (req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
}).fields([
    { name: 'file1', maxCount: 1 },
    { name: 'file2', maxCount: 1 },
    { name: 'file3', maxCount: 1 },
    { name: 'file4', maxCount: 1 },
    { name: 'gambar', maxCount: 1 }
]);

export default upload;