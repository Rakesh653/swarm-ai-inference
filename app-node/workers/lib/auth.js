'use strict'

/**
 * Collection of authentication handlers for different auth methods
 */
const authHandlers = {
  /**
   * Authenticates a user with email and password
   * @param {Object} ctx - Authentication context
   * @param {Object} req - Request containing authentication data
   * @returns {{email: string, password: string}|undefined} Authentication credentials or undefined if validation fails
   */
  passwordAuth: (ctx, req) => {
    if (req?.body?.email && req?.body?.password) {
      return { email: req.body.email, password: req.body.password }
    }
  },

  /**
   * Authenticates using an internal token that already contains email
   * @param {Object} ctx - Authentication context
   * @param {Object} req - Request containing authentication data
   * @returns {{email: string}|undefined} Authentication credentials or undefined if email is missing
   */
  internalToken: (ctx, req) => {
    if (req.email) {
      return { email: req.email }
    }
  }
}

module.exports = {
  authHandlers
}
