import express, { type Application, type Request, type Response } from 'express'
import { authRouter } from './modules/auth/auth.router'
import errorHandling from './middleware/globalErrorHandling'
import { issuesRouter } from './modules/issues/issues.router'
const app: Application = express()
app.use(express.json())



// auth
app.use('/api/auth', authRouter)
// issues
app.use('/api/issues', issuesRouter)


// global error handling
app.use(errorHandling)

app.get('/', (req: Request, res: Response) => {
    res.status(200).json({ message: "DevPulse Server ..." })
})

export default app