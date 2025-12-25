const fs = require('fs').promises
const path = require('path')
const pythonService = require('./python.service')

function preprocessText(rawText = '') {
  if (!rawText || typeof rawText !== 'string') return []

  // Normalize whitespace and remove control characters
  const cleaned = rawText
    .replace(/\r\n?/g, '\n')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  if (!cleaned) return []

  const words = cleaned.split(/\s+/)
  const chunks = []
  let current = []

  const minWords = 100
  const maxWords = 250

  for (let i = 0; i < words.length; i++) {
    current.push(words[i])

    const isSentenceBoundary = /[.!?]$/.test(words[i])
    const reachedMin = current.length >= minWords
    const reachedMax = current.length >= maxWords

    if (reachedMax || (reachedMin && isSentenceBoundary)) {
      chunks.push(current.join(' '))
      current = []
    }
  }

  if (current.length > 0) {
    // Add the remaining words as the final chunk
    chunks.push(current.join(' '))
  }

  return chunks
}

function attachCitations(questions = [], fallbackText = '') {
  return questions.map((q) => {
    const citation =
      q.citation ||
      q.context ||
      (typeof q.source === 'string' ? q.source : '') ||
      fallbackText ||
      null

    return {
      ...q,
      citation
    }
  })
}

// Simple fallback quiz generator (very basic)
function generateSimpleQuiz(text, numQuestions = 5) {
  const sentences = text.split(/[.!?]\s+/).filter(s => s.trim().length > 20)
  const questions = []
  const maxQuestions = Math.min(numQuestions, Math.floor(sentences.length / 2))
  
  for (let i = 0; i < maxQuestions && i < sentences.length; i++) {
    const sentence = sentences[i].trim()
    if (sentence.length < 30) continue
    
    // Extract key words
    const words = sentence.split(/\s+/).filter(w => w.length > 4)
    if (words.length < 3) continue
    
    const keyWord = words[Math.floor(words.length / 2)]
    const question = sentence.replace(keyWord, '_____')
    
    // Generate simple choices
    const choices = [
      keyWord,
      words[0] || 'Option A',
      words[words.length - 1] || 'Option B',
      'None of the above'
    ].slice(0, 4)
    
    // Shuffle choices
    for (let j = choices.length - 1; j > 0; j--) {
      const k = Math.floor(Math.random() * (j + 1));
      [choices[j], choices[k]] = [choices[k], choices[j]]
    }
    
    const correctIndex = choices.indexOf(keyWord)
    
    questions.push({
      type: 'mcq',
      question: question,
      answer: keyWord,
      citation: sentence,
      choices: choices,
      answer_index: correctIndex >= 0 ? correctIndex : 0
    })
  }
  
  return { questions }
}

// Import pdf-parse with fallback handling
// pdf-parse v2.x uses PDFParse class instead of function
let PDFParse
try {
  const pdfParseModule = require('pdf-parse')
  PDFParse = pdfParseModule.PDFParse || pdfParseModule
  // Check if it's a class/constructor
  if (typeof PDFParse !== 'function') {
    console.warn('pdf-parse PDFParse is not a function, will use Python only for PDF extraction')
    PDFParse = null
  }
} catch (error) {
  console.warn('pdf-parse not available, will use Python only for PDF extraction:', error.message)
  PDFParse = null
}

// helper gọi HF Space; Node 18+ có fetch global
// async function callQAGService(payload) {
//   const base = process.env.QAG_API_BASE
//   if (!base) {
//     throw new Error('QAG_API_BASE not set')
//   }

//   const resp = await fetch(`${base}/qg`, {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify(payload),
//   })

//   let data
//   try {
//     data = await resp.json()
//   } catch {
//     data = null
//   }

//   if (!resp.ok) {
//     const msg = (data && data.error) || `QAG service error ${resp.status}`
//     const err = new Error(msg)
//     err.status = 502
//     throw err
//   }

//   return data
// }

async function callQAGSpace(text, maxQuestions = 5) {
  const base = process.env.QAG_API_BASE;
  if (!base) {
    const err = new Error('QAG_API_BASE environment variable is not set');
    err.status = 500;
    throw err;
  }

  try {
    const resp = await fetch(`${base}/qg`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, max_questions: maxQuestions })
    });

    let data;
    try {
      data = await resp.json();
    } catch (e) {
      const text = await resp.text();
      const err = new Error(`QAG service error ${resp.status}: ${text}`);
      err.status = resp.status || 502;
      throw err;
    }

    if (!resp.ok) {
      const err = new Error(data.detail || data.error || `QAG service error ${resp.status}`);
      err.status = resp.status || 502;
      throw err;
    }
    return data; // {questions: [...]}
  } catch (error) {
    if (error.status) {
      throw error;
    }
    const err = new Error(`Failed to call QAG service: ${error.message}`);
    err.status = 502;
    throw err;
  }
}


exports.generateFromText = async (text, numQuestions) => {
  // Use Python script to generate quiz
  try {
    const contexts = preprocessText(text)
    const payload = contexts.length ? contexts.join('\n\n') : text
    const fallbackContext = payload || text

    const questions = await pythonService.generateQuizFromText(payload, numQuestions || 5)
    // Python script returns array directly, wrap it
    const wrapped = Array.isArray(questions) ? { questions } : questions
    wrapped.questions = attachCitations(wrapped.questions || [], fallbackContext)
    return wrapped
  } catch (error) {
    console.warn('Python quiz generation failed:', error.message)
    
    // Try Hugging Face Space fallback if configured
    if (process.env.QAG_API_BASE) {
      try {
        console.log('Trying Hugging Face Space fallback...')
        const contexts = preprocessText(text)
        const payload = contexts.length ? contexts.join('\n\n') : text
        const fallbackContext = payload || text

        const res = await callQAGSpace(payload, numQuestions || 5)
        res.questions = attachCitations(res.questions || [], fallbackContext)
        return res
      } catch (hfError) {
        console.warn('Hugging Face fallback also failed:', hfError.message)
        // Continue to simple fallback
      }
    }
    
    // Final fallback: simple quiz generator
    console.log('Using simple fallback quiz generator...')
    try {
      const simpleQuiz = generateSimpleQuiz(text, numQuestions || 5)
      if (simpleQuiz.questions && simpleQuiz.questions.length > 0) {
        console.log(`Generated ${simpleQuiz.questions.length} questions using simple fallback`)
        simpleQuiz.questions = attachCitations(simpleQuiz.questions, text)
        return simpleQuiz
      }
    } catch (simpleError) {
      console.error('Simple fallback also failed:', simpleError.message)
    }
    
    // If all methods fail, throw a helpful error
    throw new Error(
      'Quiz generation failed. Please install Python dependencies: ' +
      'cd backend/fastAPI && pip install -r requirements.txt. ' +
      `Original error: ${error.message}`
    )
  }
}

exports.generateFromFile = async (file, numQuestions) => {
  const uploadPath = path.join(__dirname, '../../uploads', file.filename)
  let content = ''

  if (file.mimetype === 'text/plain') {
    content = await fs.readFile(uploadPath, 'utf8')
  } else if (file.mimetype === 'application/pdf') {
    // Use Python script to extract text from PDF
    try {
      content = await pythonService.extractTextFromPDF(uploadPath)
      
      // Lưu file text sau khi extract
      const outputsDir = path.join(__dirname, '../../outputs')
      try {
        await fs.mkdir(outputsDir, { recursive: true })
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
        const originalName = file.originalname.replace(/\.[^/.]+$/, '') // Remove extension
        const textFilePath = path.join(outputsDir, `${originalName}_${timestamp}.txt`)
        await fs.writeFile(textFilePath, content, 'utf8')
        console.log(`Saved extracted text to: ${textFilePath}`)
      } catch (saveError) {
        console.warn('Failed to save extracted text file:', saveError.message)
        // Không throw error, chỉ log warning
      }
    } catch (error) {
      // Fallback to pdf-parse if Python fails
      if (!PDFParse) {
        throw new Error('PDF extraction failed: Python script failed and pdf-parse is not available. Please install Python dependencies: pip install -r requirements.txt')
      }
      console.warn('Python extraction failed, using pdf-parse fallback:', error.message)
      try {
        const buf = await fs.readFile(uploadPath)
        // pdf-parse v2.x: use PDFParse class with 'data' parameter
        const parser = new PDFParse({ data: buf })
        const pdfData = await parser.getText()
        await parser.destroy() // Clean up resources
        content = pdfData.text || ''
      } catch (pdfError) {
        throw new Error(`PDF extraction failed: ${error.message}. Fallback also failed: ${pdfError.message}`)
      }
    }
  } else {
    const err = new Error('Only PDF or TXT allowed')
    err.status = 400
    throw err
  }

  if (!content.trim()) {
    const err = new Error('Could not extract text from file')
    err.status = 400
    throw err
  }

  // Use Python script to generate quiz với numQuestions được truyền vào
  const defaultQuestions = numQuestions || 10
  try {
    const questions = await pythonService.generateQuizFromText(content, defaultQuestions)
    // Python script returns array directly, wrap it
    const contexts = preprocessText(content)
    const payloadContext = contexts.length ? contexts.join('\n\n') : content
    const wrapped = Array.isArray(questions) ? { questions } : questions
    wrapped.questions = attachCitations(wrapped.questions || [], payloadContext)
    return wrapped
  } catch (error) {
    console.warn('Python quiz generation failed:', error.message)
    
    // Try Hugging Face Space fallback if configured
    if (process.env.QAG_API_BASE) {
      try {
        console.log('Trying Hugging Face Space fallback...')
        const contexts = preprocessText(content)
        const payload = contexts.length ? contexts.join('\n\n') : content
        const res = await callQAGSpace(payload, defaultQuestions)
        res.questions = attachCitations(res.questions || [], payload)
        return res
      } catch (hfError) {
        console.warn('Hugging Face fallback also failed:', hfError.message)
        // Continue to simple fallback
      }
    }
    
    // Final fallback: simple quiz generator
    console.log('Using simple fallback quiz generator...')
    try {
      const simpleQuiz = generateSimpleQuiz(content, defaultQuestions)
      if (simpleQuiz.questions && simpleQuiz.questions.length > 0) {
        console.log(`Generated ${simpleQuiz.questions.length} questions using simple fallback`)
        return simpleQuiz
      }
    } catch (simpleError) {
      console.error('Simple fallback also failed:', simpleError.message)
    }
    
    // If all methods fail, throw a helpful error
    throw new Error(
      'Quiz generation failed. Please install Python dependencies: ' +
      'cd backend/fastAPI && pip install -r requirements.txt. ' +
      `Original error: ${error.message}`
    )
  }
}
