import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const appDataService = require('../backend/src/services/appDataService')

describe('appDataService', () => {
  it('maps public survey assessment without sensitive fields', () => {
    const result = appDataService.mapPublicSurveyAssessment({
      survey_id: 'SV123',
      user_id: 'U123',
      phone: '13800138000',
      score: 72,
      answers_json: [{ id: 1, value: 4 }],
      created_at: 1000,
      updated_at: 2000
    })

    expect(result).toEqual({
      surveyId: 'SV123',
      score: 72,
      createdAt: 1000,
      updatedAt: 2000
    })
  })
})
