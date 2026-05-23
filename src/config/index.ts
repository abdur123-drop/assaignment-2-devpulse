import dotenv from 'dotenv'
import path from 'path'

dotenv.config({
    path: path.join(process.cwd(), ".env")
})

const config = {
    port: process.env.PORT,
    db_secrate: process.env.DB_SECRATE,
    jwt_secrate: process.env.JWT_SECRATE
}

export default config