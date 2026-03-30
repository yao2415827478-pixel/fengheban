import { createRequire } from 'node:module'
import { afterEach, describe, expect, it, vi } from 'vitest'

const require = createRequire(import.meta.url)
const inviteService = require('../backend/src/services/inviteService')
const userService = require('../backend/src/services/userService')

afterEach(() => {
  vi.restoreAllMocks()
})

describe('inviteService', () => {
  it('returns discount info for a valid invite code', async () => {
    vi.spyOn(userService, 'findByInviteCode').mockResolvedValue({
      user_id: 'U100',
      phone: '13800138000',
      status: 'active'
    })

    const result = await inviteService.validateInviteCode('BLUE8888', '13900139000')

    expect(result).toMatchObject({
      valid: true,
      inviteCode: 'BLUE8888',
      discountAmount: 2,
      inviterId: 'U100',
      inviterPhone: '13800138000',
      inviterMaskedPhone: '138****8000'
    })
  })

  it('rejects using your own invite code', async () => {
    vi.spyOn(userService, 'findByInviteCode').mockResolvedValue({
      user_id: 'U100',
      phone: '13800138000',
      status: 'active'
    })

    const result = await inviteService.validateInviteCode('BLUE8888', '13800138000')

    expect(result.valid).toBe(false)
    expect(result.message).toBe('不能使用自己的邀请码')
  })
})
