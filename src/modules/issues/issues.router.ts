import { Router } from "express";
import { issuesController } from "./issues.controller";
import {auth} from "../../middleware/auth";
import { User_Role } from "../../types/authType";

const router = Router()

router.post('/',auth, issuesController.createIssues)
router.get('/', issuesController.getAllIssues)
router.get('/:id', issuesController.getSingleIssues)
router.patch('/:id',auth, issuesController.updateSingleIssue)
router.delete('/:id',auth, issuesController.deleteIssue)
export const issuesRouter = router


        
