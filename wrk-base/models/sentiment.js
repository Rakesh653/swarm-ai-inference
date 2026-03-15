'use strict'

const positiveWords = ['good', 'great', 'love', 'excellent', 'happy', 'awesome']
const negativeWords = ['bad', 'hate', 'terrible', 'sad', 'awful']

function infer (input) {
  const text = String(input).toLowerCase()
  let score = 0

  for (const word of positiveWords) {
    if (text.includes(word)) score += 1
  }

  for (const word of negativeWords) {
    if (text.includes(word)) score -= 1
  }

  let sentiment = 'neutral'
  if (score > 0) sentiment = 'positive'
  if (score < 0) sentiment = 'negative'

  return {
    input,
    sentiment,
    score
  }
}

module.exports = {
  infer
}
