import { pool } from "../../db";
import type { IssuesType } from "../../types/issuesType";

const createIssueIntoDB = async(payload : IssuesType, userId : string) =>{
        const {title, description, type} = payload;
        const user = await pool.query(`
            SELECT * FROM users WHERE id=$1
            `, [userId])
            if(user.rows.length === 0){
                throw new Error("User Not Exists")
            }
            const repId = user.rows[0].id

            const result = await pool.query(`
                INSERT INTO issues(title, description, type, reporter_id) VALUES($1, $2, $3, $4)
                RETURNING *
                `, [title, description, type, repId])


               return result
}

const getAllIssueFromDB = async(query: {
    sort?: string,
    type?: string,
    status?: string
}) =>{
    const conditions : string[] = [];
    const values : any[] = []
    let indx = 1

    if(query.type){
        conditions.push(`type = $${indx++}`)
        values.push(query.type)
    }

    if(query.status){
        conditions.push(`status = $${indx++}`)
        values.push(query.status)
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    const order = query.sort === 'oldest' ? 'ASC' : 'DESC'

    const allIssues = await pool.query(`
        SELECT * FROM issues ${where} ORDER BY created_at ${order}
        `, values)
        const issues = allIssues.rows
        const getAllReporter = allIssues.rows.map(R=> R.reporter_id)
        const uniqueReporterIds = [...new Set(getAllReporter)]
        const matchUsers = await pool.query(`
            SELECT id, name, role FROM users WHERE id=ANY($1)
            `, [uniqueReporterIds])
            let users = matchUsers.rows;
        const finalData = issues.map(issue =>{
            const reporter = users.find(user=> user.id === issue.reporter_id)
            const {reporter_id, ...data} = issue
            return {
                ...data,
                reporter
            }
        })
        return finalData
}

const getSingleIssueFromDB = async(param: string) =>{
    const singleIssue = await pool.query(`
        SELECT * FROM issues WHERE id=$1
        `, [param])

        if(singleIssue.rows.length === 0){
            throw new Error("Issues Not Found")
        }

        const {reporter_id, ...issue} = singleIssue.rows[0]
        const issueId = reporter_id.toString()

        const reporter = await pool.query(`
                SELECT id, name, role FROM users WHERE id=$1
            `, [issueId])

        if(reporter.rows.length === 0){
            throw new Error("Users Not Found")
        }
        const reporterData = reporter.rows[0]

        const FinalData = {
            ...issue,
            reporter : reporterData
        }

        


        return FinalData
}

const updateSingleIssueFromDB = async(body : IssuesType ,param: string) =>{
    const {title, description, type} = body;

    const updateIssue = await pool.query(`
            UPDATE issues 
            SET title=$1,
             description=$2,
              type=$3,
               updated_at= Now()

               WHERE id=$4
               RETURNING *
        `, [title, description, type, param])
        return updateIssue.rows[0]
}


const deleteIssueFromDB  =async(param : string)=>{
    const deleteIssue = await pool.query(`
            DELETE FROM issues WHERE id=$1
        `, [param])

        return deleteIssue
}

export const issuesServices = {
    createIssueIntoDB,
    getAllIssueFromDB,
    getSingleIssueFromDB,
    updateSingleIssueFromDB,
    deleteIssueFromDB
}