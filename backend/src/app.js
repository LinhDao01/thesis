// const express = require('express')
// const cors = require('cors')
// const dotenv = require('dotenv')
// const multer = require('multer')
// const path = require('path')
// const fs = require('fs').promises
// const pdfParse = require('pdf-parse')
// const { specs, swaggerUi } = require("./docs/swagger");

// dotenv.config()

// const app = express()
// const PORT = process.env.PORT || 3000
// const openapiDocument = specs

// async function callQAGService(payload) {
//   const HF = process.env.QAG_API_BASE
//   if (!HF) throw new Error('QAG_API_BASE not set')

//   const response = await fetch(`${HF}/qg`, {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify(payload),
//   })

//   if (!response.ok) {
//     const bodyText = await response.text().catch(() => '')
//     throw new Error(`QAG service error ${response.status}: ${bodyText}`)
//   }

//   return response.json()
// }

// // Swagger UI
// app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapiDocument))

// // CORS
// app.use(cors({
//   origin: process.env.FRONTEND_ORIGIN || '*',
// }))

// // Parse JSON
// app.use(express.json({ limit: '10mb' }))

// // Upload folder
// const upload = multer({
//   dest: path.join(__dirname, 'uploads'),
//   fileFilter: (req, file, cb) => {
//     const ok = ['application/pdf', 'text/plain'].includes(file.mimetype)
//     if (!ok) return cb(new Error('Only PDF or TXT allowed'))
//     cb(null, true)
//   }
// })

// // Upload endpoint
// app.post('/api/upload', upload.single('file'), (req, res) => {
//   if (!req.file) return res.status(400).json({ error: 'No file provided' })
//   res.json({
//     filename: req.file.originalname,
//     storedAs: req.file.filename,
//     mimetype: req.file.mimetype,
//     size: req.file.size
//   })
// })

// // Mock login
// app.post('/api/auth/login', (req, res) => {
//   const DEMO = { email: 'student@example.com', password: '123456' }
//   const { email, password } = req.body

//   if (email === DEMO.email && password === DEMO.password) {
//     return res.json({
//       token: 'mock-' + Date.now(),
//       user: { name: 'Student', email: DEMO.email }
//     })
//   }
//   res.status(401).json({ error: 'Invalid credentials' })
// })

// // Call Hugging Face Space
// app.post('/api/qg', async (req, res) => {
//   const HF = process.env.QAG_API_BASE
//   if (!HF) return res.status(500).json({ error: 'QAG_API_BASE not set' })

//   try {
//     const resp = await fetch(`${HF}/qg`, {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify(req.body)
//     })
//     const data = await resp.json()
//     res.status(resp.status).json(data)
//   } catch (err) {
//     res.status(502).json({ error: err.message })
//   }
// })

// app.post('/api/qg/text', async (req, res) => {
//   const { text, numQuestions } = req.body || {}
//   if (!text || !text.trim()) {
//     return res.status(400).json({ error: 'text is required' })
//   }

//   try {
//     const quiz = await callQAGService({ text, num_questions: numQuestions })
//     res.json(quiz)
//   } catch (err) {
//     console.error(err)
//     res.status(502).json({ error: err.message || 'Failed to call QAG service' })
//   }
// })

// // Health check
// app.get('/api/health', (req, res) => {
//   res.json({ ok: true })
// })

// app.listen(PORT, () => {
//   console.log(`Server running at http://localhost:${PORT}`)
// })

// module.exports = app;

const express = require("express");
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");
const { specs: swaggerDocument } = require("./docs/swagger");
const { resourceNotFound, handleError } = require("./controllers/error.controller");

// import các router mới
const qagRouter = require("./routes/qag.router");
const authRouter = require("./routes/auth.router");
const quizRouter = require("./routes/quiz.router");

const app = express();

// CORS configuration - allow frontend origin
const allowedOrigins = process.env.FRONTEND_ORIGIN
  ? process.env.FRONTEND_ORIGIN.split(',')
  : ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173', 'http://127.0.0.1:3000'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.FRONTEND_ORIGIN === '*') {
      callback(null, true);
    } else {
      callback(null, true); // Allow all for development
    }
  },
  credentials: true
}));
app.use(express.json({ limit: "10mb" }));

app.get("/", (req, res) => {
  res.send("LetQuiz API server is running");
});

// swagger
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// health (có thể đưa vào 1 router riêng nếu muốn)
app.get("/api/v1/health", (req, res) => {
  res.json({ status: "success", data: { time: new Date().toISOString() } });
});

// mount routers
authRouter.setup(app);
qagRouter.setup(app);
quizRouter.setup(app);

// 404 + error handler (phải đặt cuối cùng)
app.use(resourceNotFound);
app.use(handleError);

module.exports = app;

