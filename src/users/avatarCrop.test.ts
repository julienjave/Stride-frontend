import { describe, it, expect } from 'vitest'
import { AVATAR_OUTPUT_SIZE, planAvatarCrop } from './avatarCrop'

describe('planAvatarCrop', () => {
  it('copies the chosen square from the original, scaled down to 512', () => {
    // e.g. a 4000×3000 phone photo, circle around the middle at zoom 1.
    expect(planAvatarCrop({ x: 500, y: 0, width: 3000, height: 3000 })).toEqual({
      sourceX: 500,
      sourceY: 0,
      sourceSize: 3000,
      outputSize: 512,
    })
  })

  it('512 is the default maximum', () => {
    expect(AVATAR_OUTPUT_SIZE).toBe(512)
  })

  it('never enlarges a square smaller than the maximum', () => {
    expect(planAvatarCrop({ x: 10, y: 20, width: 300, height: 300 })).toEqual({
      sourceX: 10,
      sourceY: 20,
      sourceSize: 300,
      outputSize: 300,
    })
  })

  it('keeps a square that is exactly the maximum as it is', () => {
    expect(planAvatarCrop({ x: 0, y: 0, width: 512, height: 512 }).outputSize).toBe(512)
  })

  it('uses the smaller side if the area is off-square by a rounding pixel', () => {
    const plan = planAvatarCrop({ x: 0, y: 0, width: 801, height: 800 })
    expect(plan.sourceSize).toBe(800)
    expect(plan.outputSize).toBe(512)

    expect(planAvatarCrop({ x: 0, y: 0, width: 200, height: 201 }).sourceSize).toBe(200)
  })

  it('accepts a different maximum', () => {
    expect(planAvatarCrop({ x: 0, y: 0, width: 1000, height: 1000 }, 256).outputSize).toBe(256)
  })

  it('refuses an empty area instead of producing an empty image', () => {
    expect(() => planAvatarCrop({ x: 0, y: 0, width: 0, height: 0 })).toThrow(
      'The crop area is empty',
    )
  })

  it('accepts the smallest possible area, 1×1', () => {
    expect(planAvatarCrop({ x: 3, y: 4, width: 1, height: 1 })).toEqual({
      sourceX: 3,
      sourceY: 4,
      sourceSize: 1,
      outputSize: 1,
    })
  })
})