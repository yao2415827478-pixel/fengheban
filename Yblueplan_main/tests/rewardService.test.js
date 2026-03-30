import { afterEach, describe, expect, it, vi } from 'vitest'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const database = require('../backend/src/config/database')
const rewardServicePath = require.resolve('../backend/src/services/rewardService')

function loadRewardService() {
  delete require.cache[rewardServicePath]
  return require('../backend/src/services/rewardService')
}

afterEach(() => {
  vi.restoreAllMocks()
  delete require.cache[rewardServicePath]
})

describe('rewardService', () => {
  it('creates both rewards and activates relation in one transaction flow', async () => {
    const connectionQuery = vi.fn()
      .mockResolvedValueOnce([{
        relation_id: 'REL100',
        order_id: 'PAY100',
        inviter_user_id: 'U100',
        inviter_phone: '13800138000',
        invitee_phone: '13900139000',
        status: 'bound'
      }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ phone: '13800138000' }])
      .mockResolvedValueOnce([{ count: '2' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])

    vi.spyOn(database, 'transaction').mockImplementation(async (callback) => callback({
      query: connectionQuery
    }))

    const rewardService = loadRewardService()
    const result = await rewardService.processActivation('U200')

    expect(result.success).toBe(true)
    expect(result.status).toBe('activated')
    expect(result.newcomerReward.amount).toBe(2)
    expect(result.inviterReward.amount).toBe(5)
    expect(connectionQuery).toHaveBeenCalledTimes(7)
  })

  it('returns idempotent result when reward already exists', async () => {
    const connectionQuery = vi.fn()
      .mockResolvedValueOnce([{
        relation_id: 'REL100',
        order_id: 'PAY100',
        inviter_user_id: 'U100',
        inviter_phone: '13800138000',
        invitee_phone: '13900139000',
        status: 'bound'
      }])
      .mockResolvedValueOnce([{ ledger_id: 'LED100' }])

    vi.spyOn(database, 'transaction').mockImplementation(async (callback) => callback({
      query: connectionQuery
    }))

    const rewardService = loadRewardService()
    const result = await rewardService.processActivation('U200')

    expect(result.success).toBe(false)
    expect(result.idempotent).toBe(true)
    expect(connectionQuery).toHaveBeenCalledTimes(2)
  })

  it('stops before relation activation if reward creation fails', async () => {
    const connectionQuery = vi.fn()
      .mockResolvedValueOnce([{
        relation_id: 'REL100',
        order_id: 'PAY100',
        inviter_user_id: 'U100',
        inviter_phone: '13800138000',
        invitee_phone: '13900139000',
        status: 'bound'
      }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ phone: '13800138000' }])
      .mockResolvedValueOnce([{ count: '0' }])
      .mockResolvedValueOnce([])
      .mockRejectedValueOnce(new Error('insert inviter reward failed'))

    vi.spyOn(database, 'transaction').mockImplementation(async (callback) => callback({
      query: connectionQuery
    }))

    const rewardService = loadRewardService()

    await expect(rewardService.processActivation('U200')).rejects.toThrow('insert inviter reward failed')
    expect(connectionQuery).toHaveBeenCalledTimes(6)
  })
})
