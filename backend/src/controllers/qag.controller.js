const ApiError = require("../../api-error");
const JSend = require("../../jsend");
const qagService = require("../services/qag.service");

/**
 * POST /api/qg/text
 * Body: { text: string, numQuestions?: number }
 */
async function qgFromText(req, res, next) {
  const { text, numQuestions } = req.body || {};

  // validate input
  if (!text || !text.trim()) {
    return next(new ApiError(400, "Field 'text' is required"));
  }

  try {
    const result = await qagService.generateFromText(text, numQuestions);

    if (!result || !Array.isArray(result.questions) || result.questions.length === 0) {
      return next(
        new ApiError(400, "No questions were generated from the given text")
      );
    }

    return res.status(200).json(
      JSend.success({
        quiz: result,
      })
    );
  } catch (error) {
    console.log(error);
    return next(
      new ApiError(
        error.status || 500,
        error.message || "Unknown error occurred while generating quiz from text"
      )
    );
  }
}

/**
 * POST /api/qg/file
 * multipart/form-data, fields: file, numQuestions (optional)
 */
async function qgFromFile(req, res, next) {
  const file = req.file;

  if (!file) {
    return next(new ApiError(400, "Field 'file' is required"));
  }

  // Lấy numQuestions từ form data (có thể là string)
  const numQuestions = req.body.numQuestions 
    ? parseInt(req.body.numQuestions, 10) 
    : undefined;

  // Validate numQuestions nếu có
  if (numQuestions !== undefined && (isNaN(numQuestions) || numQuestions < 1 || numQuestions > 50)) {
    return next(new ApiError(400, "numQuestions must be between 1 and 50"));
  }

  try {
    const quiz = await qagService.generateFromFile(file, numQuestions);

    if (!quiz || !Array.isArray(quiz.questions) || quiz.questions.length === 0) {
      return next(
        new ApiError(400, "No questions were generated from the uploaded file")
      );
    }

    return res.status(200).json(
      JSend.success({
        quiz,
      })
    );
  } catch (error) {
    console.log(error);
    return next(
      new ApiError(
        error.status || 500,
        error.message || "Unknown error occurred while generating quiz from file"
      )
    );
  }
}

module.exports = {
  qgFromText,
  qgFromFile,
};
