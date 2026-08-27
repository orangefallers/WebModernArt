import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import PlayerHand from '@/components/game/PlayerHand.vue'
import PlayerRail from '@/components/game/PlayerRail.vue'
import { createDeck } from '@/domain/deck'
import { startGame } from '@/domain/game-engine'
import { artistDisplayName } from '@/services/settings.service'

describe('player panels', () => {
  it('emits a toggle action and hides the hand when collapsed', async () => {
    const game = startGame({ aiCount: 2, seed: 'collapsible-hand' })
    const human = game.players[0]!
    const wrapper = mount(PlayerHand, {
      props: { game, human, isHumanTurn: true, collapsed: false },
    })

    const toggle = wrapper.get('button.hand-toggle')
    expect(toggle.attributes('aria-expanded')).toBe('true')
    await toggle.trigger('click')
    expect(wrapper.emitted('toggle')).toHaveLength(1)

    await wrapper.setProps({ collapsed: true })
    expect(wrapper.get('button.hand-toggle').attributes('aria-expanded')).toBe('false')
    expect(wrapper.get('#player-hand-cards').isVisible()).toBe(false)
    expect(wrapper.text()).toContain('展開')
  })

  it('shows the artwork each player bought during the round', () => {
    const game = startGame({ aiCount: 2, seed: 'visible-gallery' })
    const purchasedCard = createDeck().find(
      (card) => card.artistId === 'blue' && card.auctionType === 'sealed',
    )
    if (!purchasedCard) throw new Error('expected a gallery fixture card')
    game.players[1]!.gallery.push({
      card: purchasedCard,
      acquisition: 'auction',
      sellableThisRound: true,
    })

    const wrapper = mount(PlayerRail, {
      props: { game, thinkingPlayerId: null },
    })
    const artwork = wrapper.get('.player-seat__gallery-card')

    expect(artwork.text()).toContain(artistDisplayName('blue'))
    expect(artwork.attributes('title')).toBe('塔勒 · 密封出價')
  })
})
