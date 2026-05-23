import type { NextFunction, Request, Response } from "express";
import ResponseData from "../utilities/response";
import jwt, { type JwtPayload } from "jsonwebtoken";
import config from "../config";
import { pool } from "../db";
import { User_Role, type Role } from "../types/authType";

export const auth = async (
        req: Request,
        res: Response,
        next: NextFunction
    ) => {
        try {

            const token = req.headers.authorization;

            if (!token) {
                return ResponseData(res, {
                    statusCode: 401,
                    success: false,
                    message: "Unauthorized"
                });
            }

            const decoded = jwt.verify(
                token,
                config.jwt_secrate as string
            ) as JwtPayload;
            const user = await pool.query(
                `SELECT * FROM users WHERE id=$1`,
                [decoded.id]
            );

            if (user.rows.length === 0) {
                return ResponseData(res, {
                    statusCode: 401,
                    success: false,
                    message: "User Not Found"
                });
            }

            req.user = decoded;

            next();

        } catch (error) {
            next(error);
        }
    };


