const multer = require('multer')
const path = require('path')

const upload = multer({
  dest: path.join(__dirname, '../../uploads'),
  fileFilter: (req, file, cb) => {
    const ok = ['application/pdf', 'text/plain'].includes(file.mimetype)
    if (!ok) return cb(new Error('Only PDF or TXT allowed'))
    cb(null, true)
  },
})

module.exports = upload
