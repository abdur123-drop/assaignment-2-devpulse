import type { Request, Response } from "express";
import ResponseData from "../../utilities/response";
import { authServices } from "./auth.services";

const createUser = async (req: Request, res: Response) => {
    try {
        const result = await authServices.createUserIntoDB(req.body)
        if(!result.rows[0]){
           return ResponseData(res, {
                statusCode: 400,
                success: false,
                message: 'faild to create user',
            })
        }
        ResponseData(res, {
            statusCode: 201,
            success: true,
            message: 'user create sucessfully',
            data: result.rows[0]
        })
    } catch (error: any) {
        ResponseData(res, {
            statusCode: 500,
            success: false,
            message: 'User create Unsuccessfully',
            error: error.message
        })
    }
}


const logInUser = async (req: Request, res: Response) => {
    try {
        const {email, password} = req.body;
        const result = await authServices.logInUserFromDB(email, password)
        ResponseData(res, {
            statusCode: 200,
            success: true,
            message: 'User Found sucessfully',
            data: result
        })
    } catch (error: any) {
        ResponseData(res, {
            statusCode: 500,
            success: false,
            message: 'User Found Unsuccessfully',
            error: error.message
        })
    }
}



export const authController = {
    createUser,
    logInUser
}