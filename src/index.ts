import { Router } from "express";

import csv from "./module/csv/route.js";
import excel from "./module/excel/route.js";
import json from "./module/json/route.js";
import pdf from "./module/pdf/route.js";

const router = Router()
router.use('/csv', csv)
router.use('/excel', excel)
router.use('/json', json)
router.use('/pdf', pdf)

export default router