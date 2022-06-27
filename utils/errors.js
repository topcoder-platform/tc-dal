/**
 * This file defines application errors
 */
const util = require('util')

/**
  * Helper function to create generic error object with status code
  * @param {String} name the error name
  * @param {Number} statusCode the  status code
  * @returns {Function} the error constructor
  * @private
  */
function createError (name, statusCode) {
  /**
    * The error constructor
    * @param {String} message the error message
    * @param {String} [cause] the error cause
    * @constructor
    */
  function ErrorCtor (message, cause) {
    Error.call(this)
    Error.captureStackTrace(this)
    this.message = message || name
    this.cause = cause
    this.httpStatus = statusCode
  }

  util.inherits(ErrorCtor, Error)
  ErrorCtor.prototype.name = name
  return ErrorCtor
}

module.exports = {
  BadRequestError: createError('BadRequestError', 400),
  NotFoundError: createError('NotFoundError', 404),
  ConflictError: createError('ConflictError', 409)
}
