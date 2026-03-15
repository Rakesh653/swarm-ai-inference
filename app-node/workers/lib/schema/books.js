'use strict'

const createBookBody = {
  type: 'object',
  required: ['type', 'tags', 'info', 'rack_id'],
  properties: {
    id: {
      type: 'string'
    },
    type: {
      type: 'string',
      enum: ['book']
    },
    tags: {
      type: 'array',
      items: {
        type: 'string'
      },
      minItems: 1
    },
    info: {
      type: 'object',
      required: ['name', 'author', 'status'],
      properties: {
        name: {
          type: 'string'
        },
        author: {
          type: 'string'
        },
        status: {
          type: 'string',
          enum: ['available', 'checked-out']
        },
        userId: {
          type: 'string'
        }
      }
    },
    rack_id: {
      type: 'string'
    }
  }
}

const checkoutBookBody = {
  type: 'object',
  required: ['id', 'info'],
  properties: {
    id: {
      type: 'string'
    },
    info: {
      type: 'object',
      required: ['status'],
      properties: {
        status: {
          type: 'string',
          enum: ['available', 'checked-out']
        }
      }
    },
  }
}

const updateBookBody = {
  type: 'object',
  required: ['type', 'tags', 'info', 'rack_id'],
  properties: {
    id: {
      type: 'string'
    },
    type: {
      type: 'string',
      enum: ['book']
    },
    tags: {
      type: 'array',
      items: {
        type: 'string'
      },
      minItems: 1
    },
    info: {
      type: 'object',
      required: ['name', 'author', 'status'],
      properties: {
        name: {
          type: 'string'
        },
        author: {
          type: 'string'
        },
        status: {
          type: 'string',
          enum: ['available', 'checked-out']
        }
      }
    },
    rack_id: {
      type: 'string'
    }
  }
}

module.exports = {
  createBook: {
    body: createBookBody
  },
  updateBook: {
    body: updateBookBody
  },
  checkoutBook: {
    body: checkoutBookBody
  }
}
