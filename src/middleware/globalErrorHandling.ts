import type { NextFunction, Request, Response } from "express";
import ResponseData from "../utilities/response";

const errorHandling = async(err: any,req: Request, res: Response, next: NextFunction)=>{
    ResponseData(res, {
        statusCode: 500,
        success: false,
        message: err.message || "Internal Server Error"
    })
}

export default errorHandling