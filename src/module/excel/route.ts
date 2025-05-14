import { Router } from "express";
import { Controller } from './controller.js'
import authentification from "../../middleware/authentification.js";
import upload from "../../helper/upload";

const router = Router()

router.post('/convert', authentification,upload, Controller.convert)

export default router