import 'dotenv/config';
import dotenv from "dotenv";
import express,{Request, Response,NextFunction} from 'express'
import morgan from 'morgan'
import cors from 'cors'
import { createServer } from 'http'
import routing from './index.js'


dotenv.config({ path: '.env' })
const app = express()

const server = createServer(app)
app.use(morgan('dev'))
app.use(cors())
app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.use(express.static('asset/file/'));

app.use('/', routing);
app.use((req:Request, res:Response, next:NextFunction) => {
    res.status(200).json({ status: '404', message: "not found" });
})





const port = process.env.PORT || 3000
server.listen(port, () => {
    console.log(`has connected to port : ${port}`)
});




