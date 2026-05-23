import { pool } from "../../db"
import bcrypt from 'bcrypt'
import type { RUser, User } from "../../types/authType"
import jwt from 'jsonwebtoken'
import config from "../../config"

const createUserIntoDB = async(payload :RUser & {password : string})=>{
    const {name, email, password, role} = payload
    const hashPassword = await bcrypt.hash(password, 10)
    const res = await pool.query(`
            INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, COALESCE($4,'contributor'))
            RETURNING id, name, email, role, created_at, updated_at
        `, [name, email, hashPassword, role])

        return res
}

const logInUserFromDB = async(email: string, passwordCom: string)=>{
    const user = await pool.query(`
        SELECT * FROM users WHERE email=$1
        `, [email])
        if(user.rows.length === 0){
            throw new Error("User Not Exists")
        }
        const {password, ...data} = user.rows[0] as User;
        const isValid = await bcrypt.compare(passwordCom, password)
        if(!isValid){
            throw new Error("Invalid Email or Password")
        }
        const payload = {
            id: data.id,
            name: data.name,
            role: data.role
        }
        const accessToken = await jwt.sign(payload, config.jwt_secrate as string, {expiresIn: '1d'})
        

        return {
            user: data,
            token: accessToken
        }
}


export const authServices = {
    createUserIntoDB,
    logInUserFromDB
}