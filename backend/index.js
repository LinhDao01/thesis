require("dotenv").config();
const app = require("./src/app");
// Start server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});


// const express = require('express')
// const app = express()

// const port = process.env.PORT || 3000

// app.get('/health', (req, res) => {
//   res.json({ ok: true })
// })

// app.listen(port, () => {
//   console.log(`Server running at http://localhost:${port}`)
// })
