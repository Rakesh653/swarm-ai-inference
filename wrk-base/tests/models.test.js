'use strict'

const { describe, it, expect } = require('vitest')
const sentiment = require('../models/sentiment')
const uppercase = require('../models/uppercase')
const embedding = require('../models/embedding')

describe('models', () => {
  it('sentiment returns expected shape', () => {
    const result = sentiment.infer('I love this')
    expect(result).toHaveProperty('sentiment')
    expect(result).toHaveProperty('score')
  })

  it('uppercase transforms input', () => {
    const result = uppercase.infer('hello')
    expect(result.output).toBe('HELLO')
  })

  it('embedding returns vector', () => {
    const result = embedding.infer('image')
    expect(Array.isArray(result.embedding)).toBe(true)
    expect(result.embedding.length).toBe(5)
  })
})
