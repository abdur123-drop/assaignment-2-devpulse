
   import { createRequire } from 'module';
   const require = createRequire(import.meta.url);
  

// src/app.ts
import express from "express";

// src/modules/auth/auth.router.ts
import { Router } from "express";

// src/utilities/response.ts
var ResponseData = (res, data) => {
  res.status(data.statusCode).json({
    success: data.success,
    message: data.message,
    data: data.data,
    error: data.error
  });
};
var response_default = ResponseData;

// src/db/index.ts
import { Pool } from "pg";

// src/config/index.ts
import dotenv from "dotenv";
import path from "path";
dotenv.config({
  path: path.join(process.cwd(), ".env")
});
var config = {
  port: process.env.PORT,
  db_secrate: process.env.DB_SECRATE,
  jwt_secrate: process.env.JWT_SECRATE
};
var config_default = config;

// src/db/index.ts
var pool = new Pool({
  connectionString: config_default.db_secrate
});
var initdb = async () => {
  try {
    await pool.query(`
            CREATE TABLE IF NOT EXISTS users(
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            email VARCHAR(75) UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role VARCHAR(20) DEFAULT 'contributor' CHECK (role IN ('contributor', 'maintainer')),
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
            )
            `);
    await pool.query(`
                CREATE TABLE IF NOT EXISTS issues(
                id SERIAL PRIMARY KEY,
                title VARCHAR(150) NOT NULL,
                description TEXT NOT NULL CHECK (CHAR_LENGTH(description) >= 20),
                type TEXT NOT NULL CHECK (type IN ('bug', 'feature_request')),
                status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved')),
                reporter_id INT REFERENCES users(id) ON DELETE CASCADE,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
                )
                `);
  } catch (error) {
    console.log(error);
  }
};

// src/modules/auth/auth.services.ts
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
var createUserIntoDB = async (payload) => {
  const { name, email, password, role } = payload;
  const hashPassword = await bcrypt.hash(password, 10);
  const res = await pool.query(`
            INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, COALESCE($4,'contributor'))
            RETURNING id, name, email, role, created_at, updated_at
        `, [name, email, hashPassword, role]);
  return res;
};
var logInUserFromDB = async (email, passwordCom) => {
  const user = await pool.query(`
        SELECT * FROM users WHERE email=$1
        `, [email]);
  if (user.rows.length === 0) {
    throw new Error("User Not Exists");
  }
  const { password, ...data } = user.rows[0];
  const isValid = await bcrypt.compare(passwordCom, password);
  if (!isValid) {
    throw new Error("Invalid Email or Password");
  }
  const payload = {
    id: data.id,
    name: data.name,
    role: data.role
  };
  const accessToken = await jwt.sign(payload, config_default.jwt_secrate, { expiresIn: "1d" });
  return {
    user: data,
    token: accessToken
  };
};
var authServices = {
  createUserIntoDB,
  logInUserFromDB
};

// src/modules/auth/auth.controller.ts
var createUser = async (req, res) => {
  try {
    const result = await authServices.createUserIntoDB(req.body);
    if (!result.rows[0]) {
      return response_default(res, {
        statusCode: 400,
        success: false,
        message: "faild to create user"
      });
    }
    response_default(res, {
      statusCode: 201,
      success: true,
      message: "user create sucessfully",
      data: result.rows[0]
    });
  } catch (error) {
    response_default(res, {
      statusCode: 500,
      success: false,
      message: "User create Unsuccessfully",
      error: error.message
    });
  }
};
var logInUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await authServices.logInUserFromDB(email, password);
    response_default(res, {
      statusCode: 200,
      success: true,
      message: "User Found sucessfully",
      data: result
    });
  } catch (error) {
    response_default(res, {
      statusCode: 500,
      success: false,
      message: "User Found Unsuccessfully",
      error: error.message
    });
  }
};
var authController = {
  createUser,
  logInUser
};

// src/middleware/auth.ts
import jwt2 from "jsonwebtoken";

// src/types/authType.ts
var User_Role = {
  contributor: "contributor",
  maintainer: "maintainer"
};

// src/middleware/auth.ts
var auth = async (req, res, next) => {
  try {
    const token = req.headers.authorization;
    if (!token) {
      return response_default(res, {
        statusCode: 401,
        success: false,
        message: "Unauthorized"
      });
    }
    const decoded = jwt2.verify(
      token,
      config_default.jwt_secrate
    );
    const user = await pool.query(
      `SELECT * FROM users WHERE id=$1`,
      [decoded.id]
    );
    if (user.rows.length === 0) {
      return response_default(res, {
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

// src/modules/auth/auth.router.ts
var router = Router();
router.post("/signup", authController.createUser);
router.post("/login", authController.logInUser);
var authRouter = router;

// src/middleware/globalErrorHandling.ts
var errorHandling = async (err, req, res, next) => {
  response_default(res, {
    statusCode: 500,
    success: false,
    message: err.message || "Internal Server Error"
  });
};
var globalErrorHandling_default = errorHandling;

// src/modules/issues/issues.router.ts
import { Router as Router2 } from "express";

// src/modules/issues/issues.services.ts
var createIssueIntoDB = async (payload, userId) => {
  const { title, description, type } = payload;
  const user = await pool.query(`
            SELECT * FROM users WHERE id=$1
            `, [userId]);
  if (user.rows.length === 0) {
    throw new Error("User Not Exists");
  }
  const repId = user.rows[0].id;
  const result = await pool.query(`
                INSERT INTO issues(title, description, type, reporter_id) VALUES($1, $2, $3, $4)
                RETURNING *
                `, [title, description, type, repId]);
  return result;
};
var getAllIssueFromDB = async (query) => {
  const conditions = [];
  const values = [];
  let indx = 1;
  if (query.type) {
    conditions.push(`type = $${indx++}`);
    values.push(query.type);
  }
  if (query.status) {
    conditions.push(`status = $${indx++}`);
    values.push(query.status);
  }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const order = query.sort === "oldest" ? "ASC" : "DESC";
  const allIssues = await pool.query(`
        SELECT * FROM issues ${where} ORDER BY created_at ${order}
        `, values);
  const issues = allIssues.rows;
  const getAllReporter = allIssues.rows.map((R) => R.reporter_id);
  const uniqueReporterIds = [...new Set(getAllReporter)];
  const matchUsers = await pool.query(`
            SELECT id, name, role FROM users WHERE id=ANY($1)
            `, [uniqueReporterIds]);
  let users = matchUsers.rows;
  const finalData = issues.map((issue) => {
    const reporter = users.find((user) => user.id === issue.reporter_id);
    const { reporter_id, ...data } = issue;
    return {
      ...data,
      reporter
    };
  });
  return finalData;
};
var getSingleIssueFromDB = async (param) => {
  const singleIssue = await pool.query(`
        SELECT * FROM issues WHERE id=$1
        `, [param]);
  if (singleIssue.rows.length === 0) {
    throw new Error("Issues Not Found");
  }
  const { reporter_id, ...issue } = singleIssue.rows[0];
  const issueId = reporter_id.toString();
  const reporter = await pool.query(`
                SELECT id, name, role FROM users WHERE id=$1
            `, [issueId]);
  if (reporter.rows.length === 0) {
    throw new Error("Users Not Found");
  }
  const reporterData = reporter.rows[0];
  const FinalData = {
    ...issue,
    reporter: reporterData
  };
  return FinalData;
};
var updateSingleIssueFromDB = async (body, param) => {
  const { title, description, type } = body;
  const updateIssue = await pool.query(`
            UPDATE issues 
            SET title=$1,
             description=$2,
              type=$3,
               updated_at= Now()

               WHERE id=$4
               RETURNING *
        `, [title, description, type, param]);
  return updateIssue.rows[0];
};
var deleteIssueFromDB = async (param) => {
  const deleteIssue2 = await pool.query(`
            DELETE FROM issues WHERE id=$1
        `, [param]);
  return deleteIssue2;
};
var issuesServices = {
  createIssueIntoDB,
  getAllIssueFromDB,
  getSingleIssueFromDB,
  updateSingleIssueFromDB,
  deleteIssueFromDB
};

// src/modules/issues/issues.controller.ts
var createIssues = async (req, res) => {
  try {
    const result = await issuesServices.createIssueIntoDB(req.body, req.user.id);
    response_default(res, {
      statusCode: 201,
      success: true,
      message: "Issue created successfully",
      data: result.rows[0]
    });
  } catch (error) {
    response_default(res, {
      statusCode: 500,
      success: false,
      message: "Issue created faild",
      error: error.message
    });
  }
};
var getAllIssues = async (req, res) => {
  try {
    const { sort, type, status } = req.query;
    const result = await issuesServices.getAllIssueFromDB({
      sort,
      type,
      status
    });
    response_default(res, {
      statusCode: 200,
      success: true,
      message: "Issues Found Successfully",
      data: result
    });
  } catch (error) {
    response_default(res, {
      statusCode: 500,
      success: false,
      message: "Issues Not Found",
      error: error.message
    });
  }
};
var getSingleIssues = async (req, res) => {
  try {
    const param = req.params.id;
    const result = await issuesServices.getSingleIssueFromDB(param);
    response_default(res, {
      statusCode: 200,
      success: true,
      message: "Single Issue Found Successfully",
      data: result
    });
  } catch (error) {
    response_default(res, {
      statusCode: 500,
      success: false,
      message: "Single Issue Not Found",
      error: error.message
    });
  }
};
var updateSingleIssue = async (req, res) => {
  try {
    const user = req.user;
    const param = req.params.id;
    const allIssues = await pool.query(`
                SELECT * FROM issues WHERE id=$1
            `, [param]);
    if (allIssues.rows.length === 0) {
      return response_default(res, {
        statusCode: 404,
        success: false,
        message: "Issue Not Found"
      });
    }
    const issue = allIssues.rows[0];
    if (user.role === User_Role.maintainer) {
      const result = await issuesServices.updateSingleIssueFromDB(req.body, param);
      return response_default(res, {
        statusCode: 200,
        success: true,
        message: "Issue updated successfully",
        data: result
      });
    }
    if (user.role === User_Role.contributor) {
      const isOwner = issue.reporter_id === user.id;
      const isOpen = issue.status === "open";
      if (!isOwner) {
        return response_default(res, {
          statusCode: 403,
          success: false,
          message: "You can only update your own issues"
        });
      }
      if (!isOpen) {
        return response_default(res, {
          statusCode: 403,
          success: false,
          message: "You can only update open issues"
        });
      }
      const result = await issuesServices.updateSingleIssueFromDB(req.body, param);
      return response_default(res, {
        statusCode: 200,
        success: true,
        message: "Issue updated successfully",
        data: result
      });
    }
  } catch (error) {
    response_default(res, {
      statusCode: 500,
      success: false,
      message: "Issue updated failed",
      error: error.message
    });
  }
};
var deleteIssue = async (req, res) => {
  try {
    const user = req.user;
    const param = req.params.id;
    const issue = await pool.query(`
                SELECT * FROM issues WHERE id=$1
            `, [param]);
    if (issue.rows.length === 0) {
      return response_default(res, {
        statusCode: 404,
        success: false,
        message: "Issue Not Found"
      });
    }
    if (user.role !== User_Role.maintainer) {
      return response_default(res, {
        statusCode: 403,
        success: false,
        message: "Forbidden! You are not able to delete issue"
      });
    }
    if (user.role === User_Role.maintainer) {
      await issuesServices.deleteIssueFromDB(param);
      return response_default(res, {
        statusCode: 200,
        success: true,
        message: "Issue deleted successfully"
      });
    }
  } catch (error) {
    response_default(res, {
      statusCode: 500,
      success: false,
      message: "Issue deleted faild"
    });
  }
};
var issuesController = {
  createIssues,
  getAllIssues,
  getSingleIssues,
  updateSingleIssue,
  deleteIssue
};

// src/modules/issues/issues.router.ts
var router2 = Router2();
router2.post("/", auth, issuesController.createIssues);
router2.get("/", issuesController.getAllIssues);
router2.get("/:id", issuesController.getSingleIssues);
router2.patch("/:id", auth, issuesController.updateSingleIssue);
router2.delete("/:id", auth, issuesController.deleteIssue);
var issuesRouter = router2;

// src/app.ts
import cors from "cors";
var app = express();
app.use(express.json());
app.use(cors({
  origin: "https://assaignment-2-level-2.vercel.app"
}));
app.use("/api/auth", authRouter);
app.use("/api/issues", issuesRouter);
app.use(globalErrorHandling_default);
app.get("/", (req, res) => {
  res.status(200).json({ message: "DevPulse Server ..." });
});
var app_default = app;

// src/server.ts
var main = () => {
  initdb();
  app_default.listen(config_default.port, () => {
    console.log(`Example app listening on port ${config_default.port}`);
  });
};
main();
//# sourceMappingURL=server.js.map