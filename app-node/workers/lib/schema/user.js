'use strict'

const signupBody = {
  type: 'object',
  required: ['email', 'password', 'signup_secret', 'roles'],
  properties: {
    email: {
      type: 'string',
      format: 'email'
    },
    password: {
      type: 'string',
      minLength: 6
    },
    signup_secret: {
      type: 'string'
    },
    roles: {
      type: 'array',
      items: {
        type: 'string'
      },
      minItems: 1
    }
  }
}

const loginBody = {
  type: 'object',
  required: ['email', 'password']
}

module.exports = {
  signup: {
    body: signupBody
  },
  login: {
    body: loginBody
  }
}
