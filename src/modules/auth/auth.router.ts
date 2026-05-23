import { Router } from "express";
import { authController } from "./auth.controller";
import {auth} from "../../middleware/auth";

const router = Router()

router.post('/signup', authController.createUser)
router.post('/login', authController.logInUser)

export const authRouter = router