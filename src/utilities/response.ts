import type { Response } from "express"
import type { responseType } from "../types/responseType"

const ResponseData = (res: Response, data: responseType<any>) =>{
    res.status(data.statusCode).json({
        success: data.success,
        message: data.message,
        data: data.data,
        error: data.error
    })
}

export default ResponseData