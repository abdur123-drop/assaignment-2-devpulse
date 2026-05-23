import type { Request, Response } from "express";
import ResponseData from "../../utilities/response";
import { issuesServices } from "./issues.services";
import { pool } from "../../db";
import { User_Role } from "../../types/authType";

const createIssues = async (req: Request, res: Response) => {
    try {
        const result = await issuesServices.createIssueIntoDB(req.body, req.user.id)
        ResponseData(res, {
            statusCode: 201,
            success: true,
            message: 'Issue created successfully',
            data: result.rows[0]
        })
    } catch (error: any) {
        ResponseData(res, {
            statusCode: 500,
            success: false,
            message: 'Issue created faild',
            error: error.message
        })
    }
}

const getAllIssues = async (req: Request, res: Response) => {
    try {
        const {sort, type, status} = req.query;
        const result = await issuesServices.getAllIssueFromDB({
            sort: sort as string,
            type: type as string,
            status: status as string
        })
        ResponseData(res, {
            statusCode: 200,
            success: true,
            message: 'Issues Found Successfully',
            data: result
        })
    } catch (error: any) {
        ResponseData(res, {
            statusCode: 500,
            success: false,
            message: 'Issues Not Found',
            error: error.message
        })
    }
}

const getSingleIssues = async (req: Request, res: Response) => {
    try {
        const param = req.params.id
        const result = await issuesServices.getSingleIssueFromDB(param as string)
        ResponseData(res, {
            statusCode: 200,
            success: true,
            message: 'Single Issue Found Successfully',
            data: result
        })
    } catch (error: any) {
        ResponseData(res, {
            statusCode: 500,
            success: false,
            message: 'Single Issue Not Found',
            error: error.message
        })
    }
}

const updateSingleIssue = async (req: Request, res: Response) => {
    try {
        const user = req.user;
        const param = req.params.id
        const allIssues = await pool.query(`
                SELECT * FROM issues WHERE id=$1
            `, [param])

        if (allIssues.rows.length === 0) {
           return ResponseData(res, {
                statusCode: 404,
                success: false,
                message: 'Issue Not Found'
            })
        }


        const issue = allIssues.rows[0]



        if (user.role === User_Role.maintainer) {
            const result = await issuesServices.updateSingleIssueFromDB(req.body, param as string)
           return ResponseData(res, {
            statusCode: 200,
            success: true,
            message: 'Issue updated successfully',
            data: result
        })
        }

        if (user.role === User_Role.contributor) {
            const isOwner = issue.reporter_id === user.id
            const isOpen = issue.status === "open"
// is he owner of this issue
            if (!isOwner) {
               return ResponseData(res, {
                    statusCode: 403,
                    success: false,
                    message: 'You can only update your own issues'
                })
            }
//  is this status is open
            if(!isOpen){
               return ResponseData(res, {
                    statusCode: 403,
                    success: false,
                    message: 'You can only update open issues'
                })
            }

            const result = await issuesServices.updateSingleIssueFromDB(req.body, param as string)
           return ResponseData(res, {
            statusCode: 200,
            success: true,
            message: 'Issue updated successfully',
            data: result
        })
        }

    } catch (error: any) {
        ResponseData(res, {
            statusCode: 500,
            success: false,
            message: 'Issue updated failed',
            error: error.message
        })
    }
}

const deleteIssue = async(req: Request, res: Response) =>{
    try {

        const user = req.user;
        const param = req.params.id;

        const issue = await pool.query(`
                SELECT * FROM issues WHERE id=$1
            `, [param])

            if(issue.rows.length === 0){
               return ResponseData(res, {
            statusCode: 404,
            success: false,
            message: 'Issue Not Found',
        })
            }

            if(user.role !== User_Role.maintainer){
               return ResponseData(res, {
            statusCode: 403,
            success: false,
            message: 'Forbidden! You are not able to delete issue'
        })
            }

            if(user.role === User_Role.maintainer){
                await issuesServices.deleteIssueFromDB(param as string)
               return ResponseData(res, {
            statusCode: 200,
            success: true,
            message: 'Issue deleted successfully'
        })
            }

            
            
        
        
    } catch (error) {
        ResponseData(res, {
            statusCode: 500,
            success: false,
            message: 'Issue deleted faild'
        })
    }
}

export const issuesController = {
    createIssues,
    getAllIssues,
    getSingleIssues,
    updateSingleIssue,
    deleteIssue
}