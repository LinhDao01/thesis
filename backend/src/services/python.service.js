const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs').promises;

const execAsync = promisify(exec);

/**
 * Extract text from PDF using Python script
 * @param {string} pdfPath - Path to PDF file
 * @returns {Promise<string>} Extracted text
 */
async function extractTextFromPDF(pdfPath) {
  try {
    const scriptPath = path.join(__dirname, '../../fastAPI/extract_text.py');
    // Try python3 first, fallback to python
    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
    const command = `${pythonCmd} "${scriptPath}" "${pdfPath}"`;

    const { stdout, stderr } = await execAsync(command, {
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer
    });

    // Check if Python script exited with error (stderr contains actual errors)
    if (stderr && !stderr.includes('WARNING') && !stderr.includes('nltk')) {
      const err = new Error(`Python script error: ${stderr}`);
      err.status = 500;
      throw err;
    }

    const extractedText = stdout.trim();
    if (!extractedText) {
      const err = new Error('Python script returned empty text. The PDF might be empty or corrupted.');
      err.status = 400;
      throw err;
    }

    return extractedText;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    // Preserve status code if it exists
    const err = new Error(`Failed to extract text from PDF: ${error.message}`);
    if (error.status) err.status = error.status;
    throw err;
  }
}

/**
 * Generate quiz questions from text using Python script
 * @param {string} text - Input text
 * @param {number} topN - Number of questions to generate (default: 4)
 * @returns {Promise<Array>} Array of quiz questions
 */
async function generateQuizFromText(text, topN = 4) {
  try {
    const scriptDir = path.join(__dirname, '../../fastAPI');
    const tempFile = path.join(__dirname, '../../temp_input.txt');

    // Write text to temp file
    await fs.writeFile(tempFile, text, 'utf8');

    // Call Python script using module import
    // Try python3 first, fallback to python
    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
    const scriptDirEscaped = scriptDir.replace(/\\/g, '/');
    const tempFileEscaped = tempFile.replace(/\\/g, '/');
    const command = `${pythonCmd} -c "import sys; import os; sys.path.insert(0, r'${scriptDirEscaped}'); os.chdir(r'${scriptDirEscaped}'); from quiz_api import generate_questions; import json; result = generate_questions(open(r'${tempFileEscaped}', 'r', encoding='utf-8').read(), top_n=${topN}); print(json.dumps(result, ensure_ascii=False))"`;

    const { stdout, stderr } = await execAsync(command, {
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer
    });

    // Clean up temp file
    try {
      await fs.unlink(tempFile);
    } catch (e) {
      // Ignore cleanup errors
    }

    if (stderr && !stderr.includes('WARNING') && !stderr.includes('nltk')) {
      console.error('Python stderr:', stderr);
    }

    // Parse JSON output
    const output = stdout.trim();
    if (!output) {
      const err = new Error('Python script returned empty output');
      err.status = 500;
      throw err;
    }

    try {
      const result = JSON.parse(output);
      if (!Array.isArray(result) && (!result.questions || !Array.isArray(result.questions))) {
        const err = new Error('Python script returned invalid format. Expected array of questions.');
        err.status = 500;
        throw err;
      }
      return result;
    } catch (parseError) {
      console.error('Failed to parse Python output:', output.substring(0, 500));
      const err = new Error(`Failed to parse quiz output: ${parseError.message}`);
      err.status = 500;
      throw err;
    }
  } catch (error) {
    console.error('Error generating quiz:', error);
    // Preserve status code if it exists
    const err = new Error(`Failed to generate quiz: ${error.message}`);
    if (error.status) err.status = error.status;
    throw err;
  }
}

module.exports = {
  extractTextFromPDF,
  generateQuizFromText,
};

