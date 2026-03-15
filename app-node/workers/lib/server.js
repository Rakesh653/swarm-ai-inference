'use strict'

const async = require('async')
const bookSchema = require('./schema/books')

/**
 * Sends an HTTP 200 response with provided data
 * @param {object} rep - The HTTP response object
 * @param {any} data - The data to send in the response
 */
function send200 (rep, data) {
  rep.status(200).send(data)
}

/**
 * Retrieves all books from configured storage providers
 * @param {object} ctx - The application context
 * @returns {Promise<Array>} Array of book objects
 */
async function getBooks (ctx) {
  const res = await async.mapLimit(ctx.conf.orks, 2, async (store) => {
    return ctx.net_r0.jRequest(
      store.rpcPublicKey,
      'listThings',
      {},
      { timeout: 15000 }
    )
  })

  return res.flat()
}

/**
 * Route handler for retrieving all books
 * @param {object} ctx - The application context
 * @param {object} _req - The HTTP request object (unused)
 * @returns {Promise<Array>} Array of book objects
 */
async function getBooksRoute (ctx, _req) {
  const res = getBooks(ctx)

  return res
}

/**
 * Handles book checkout process
 * @param {object} ctx - The application context
 * @param {object} req - The HTTP request object
 * @returns {Promise<Array>} Result of the book update operation
 * @throws {Error} If book is not found
 */
async function checkoutBookRoute (ctx, req) {
  const bookId = req.body.id
  const allBooks = await getBooks(ctx)

  const bookToCheckout = allBooks.find(book => book.id === bookId)

  if (!bookToCheckout) {
    throw new Error('ERR_BOOK_NOT_FOUND')
  }

  let infoToUpdate = {}
  if (req.body?.info?.status === 'checked-out') {
    infoToUpdate = {
      ...bookToCheckout.info,
      userId: req._info?.user?.userId,
      status: req.body?.info?.status
    }
  } else {
    infoToUpdate = {
      ...bookToCheckout.info,
      status: req.body?.info?.status
    }

    delete infoToUpdate.userId
  }

  bookToCheckout.info = infoToUpdate

  return await updateBook(ctx, bookId, bookToCheckout)
}

/**
 * Updates a book's information in storage
 * @param {object} ctx - The application context
 * @param {string} bookId - The ID of the book to update
 * @param {object} book - The updated book data
 * @returns {Promise<Array>} Results from storage providers
 */
async function updateBook (ctx, bookId, book) {
  const res = await async.mapLimit(ctx.conf.orks, 2, async (store, sid) => {
    return ctx.net_r0.jRequest(
      store.rpcPublicKey,
      'updateThing',
      {
        id: bookId,
        ...book
      },
      { timeout: 15000 }
    )
  })
  return res
}

/**
 * Route handler for updating a book
 * @param {object} ctx - The application context
 * @param {object} req - The HTTP request object
 * @returns {Promise<Array>} Results from the update operation
 */
async function updateBookRoute (ctx, req) {
  const res = updateBook(ctx, req.params.bookId, req.body)
  return res
}

/**
 * Deletes a book from storage
 * @param {object} ctx - The application context
 * @param {string} bookId - The ID of the book to delete
 * @returns {Promise<Array>} Results from storage providers
 */
async function deleteBook (ctx, bookId) {
  const res = await async.mapLimit(ctx.conf.orks, 2, async (store, sid) => {
    return ctx.net_r0.jRequest(
      store.rpcPublicKey,
      'forgetThing',
      { id: bookId },
      { timeout: 15000 }
    )
  })

  return res
}

/**
 * Route handler for deleting a book
 * @param {object} ctx - The application context
 * @param {object} req - The HTTP request object
 * @returns {Promise<Array>} Results from the delete operation
 */
async function deleteBookRoute (ctx, req) {
  const res = deleteBook(ctx, req.params.bookId)
  return res
}

/**
 * Route handler for creating a new book
 * @param {object} ctx - The application context
 * @param {object} req - The HTTP request object
 * @returns {Promise<Array>} Results from the book creation
 */
async function createBookRoute (ctx, req) {
  const res = createBook(ctx, req.body)
  return res
}

/**
 * Creates a new book in storage
 * @param {object} ctx - The application context
 * @param {object} book - The book data to create
 * @returns {Promise<Array>} Results from storage providers
 */
async function createBook (ctx, book) {
  const res = await async.mapLimit(ctx.conf.orks, 2, async (store, sid) => {
    return ctx.net_r0.jRequest(
      store.rpcPublicKey,
      'registerThing',
      book,
      { timeout: 15000 }
    )
  })

  return res
}

/**
 * Defines the application routes
 * @param {object} ctx - The application context
 * @returns {Array<object>} Array of route configuration objects
 */
function routes (ctx) {
  return [
    {
      method: 'GET',
      url: '/books',
      handler: async (req, rep) => {
        send200(
          rep,
          await getBooksRoute(ctx, req)
        )
      }
    },
    {
      method: 'DELETE',
      url: '/books/:bookId',
      handler: async (req, rep) => {
        send200(
          rep,
          await deleteBookRoute(ctx, req)
        )
      }
    },
    {
      method: 'PUT',
      url: '/books/:bookId',
      schema: bookSchema.updateBook,
      handler: async (req, rep) => {
        send200(
          rep,
          await updateBookRoute(ctx, req)
        )
      }
    },
    {
      method: 'POST',
      url: '/checkout',
      schema: bookSchema.checkoutBook,
      handler: async (req, rep) => {
        send200(
          rep,
          await checkoutBookRoute(ctx, req)
        )
      }
    },
    {
      method: 'POST',
      url: '/books',
      schema: bookSchema.createBook,
      handler: async (req, rep) => {
        send200(
          rep,
          await createBookRoute(ctx, req)
        )
      }
    }
  ]
}

module.exports = {
  routes
}
