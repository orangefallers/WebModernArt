import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import MarketBoard from '@/components/game/MarketBoard.vue'
import { startGame } from '@/domain/game-engine'
import {
  DEFAULT_ARTIST_NAMES,
  restoreDefaultArtistNames,
  saveArtistNames,
} from '@/services/settings.service'

describe('MarketBoard', () => {
  afterEach(() => restoreDefaultArtistNames())

  it('shows only the configured artist name without the default English subtitle', () => {
    saveArtistNames({ ...DEFAULT_ARTIST_NAMES, yellow: '新畫家' })

    const wrapper = mount(MarketBoard, {
      props: { game: startGame({ aiCount: 2, seed: 'market-artist-name' }) },
    })

    expect(wrapper.text()).toContain('新畫家')
    expect(wrapper.text()).not.toContain('Carvalho')
    expect(wrapper.find('.artist-key small').exists()).toBe(false)
  })

  it('colors past market awards gold, silver, and bronze', () => {
    const game = startGame({ aiCount: 2, seed: 'market-award-colors' })
    game.marketHistory = [
      {
        round: 1,
        values: { yellow: 30, blue: 20, red: 10, green: 0, brown: 0 },
        counts: { yellow: 5, blue: 4, red: 3, green: 2, brown: 1 },
      },
    ]

    const wrapper = mount(MarketBoard, { props: { game } })

    expect(wrapper.get('.market-board__value--gold').text()).toBe('$30')
    expect(wrapper.get('.market-board__value--silver').text()).toBe('$20')
    expect(wrapper.get('.market-board__value--bronze').text()).toBe('$10')
  })
})
