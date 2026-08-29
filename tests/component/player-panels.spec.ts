import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import PlayerHand from '@/components/game/PlayerHand.vue'
import PlayerRail from '@/components/game/PlayerRail.vue'
import { createDeck } from '@/domain/deck'
import { playCard, startGame } from '@/domain/game-engine'
import { artistDisplayName } from '@/services/settings.service'
import { restoreDefaultDeveloperSettings } from '@/services/developer-settings.service'

describe('player panels', () => {
  afterEach(() => restoreDefaultDeveloperSettings())

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

  it('marks the auctioneer separately while preserving the current bidder highlight', () => {
    const game = startGame({ aiCount: 2, seed: 'auctioneer-seat-icon' })
    game.auctioneerIndex = 1
    const auctionCard = createDeck().find((card) => card.auctionType === 'once-around')
    if (!auctionCard) throw new Error('expected an auction card')
    game.players[1]!.hand = [auctionCard]
    const auctionState = playCard(game, 'ai-1', auctionCard.id)

    const wrapper = mount(PlayerRail, {
      props: { game: auctionState, actorId: 'ai-2', thinkingPlayerId: null },
    })
    const seats = wrapper.findAll('.player-seat')

    expect(seats[1]?.find('.player-seat__auctioneer-icon').exists()).toBe(true)
    expect(seats[1]?.classes()).not.toContain('player-seat--active')
    expect(seats[2]?.classes()).toContain('player-seat--active')
    expect(seats[2]?.find('.player-seat__auctioneer-icon').exists()).toBe(false)
  })

  it('marks the latest winner without replacing the current bidder highlight', () => {
    const game = startGame({ aiCount: 2, seed: 'latest-winner-seat' })
    const wrapper = mount(PlayerRail, {
      props: {
        game,
        actorId: 'ai-2',
        thinkingPlayerId: null,
        latestWinnerId: 'ai-1',
      },
    })
    const seats = wrapper.findAll('.player-seat')

    expect(seats[1]?.classes()).toContain('player-seat--latest-winner')
    expect(seats[1]?.classes()).not.toContain('player-seat--active')
    expect(seats[2]?.classes()).toContain('player-seat--active')
    expect(seats[2]?.classes()).not.toContain('player-seat--latest-winner')
  })

  it('hides only AI cash by default', () => {
    const game = startGame({ aiCount: 2, seed: 'hidden-ai-cash' })
    const wrapper = mount(PlayerRail, {
      props: { game, thinkingPlayerId: null },
    })
    const seats = wrapper.findAll('.player-seat')

    expect(seats[0]?.get('.player-seat__cash').text()).toBe('$100k')
    expect(seats[1]?.get('.player-seat__cash').text()).toBe('—')
    expect(seats[1]?.text()).not.toContain('$100k')
    expect(seats[2]?.get('.player-seat__cash').text()).toBe('—')
  })
})
