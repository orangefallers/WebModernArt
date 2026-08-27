import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import SettingsModal from '@/components/common/SettingsModal.vue'
import ArtworkCard from '@/components/game/ArtworkCard.vue'
import { createDeck } from '@/domain/deck'
import { ARTIST_IDS } from '@/domain/model'
import {
  artistDisplayName,
  restoreDefaultArtistNames,
  validateArtistName,
} from '@/services/settings.service'

describe('artist name settings', () => {
  afterEach(() => restoreDefaultArtistNames())

  it('accepts Chinese and English letters while rejecting invalid or long names', () => {
    expect(validateArtistName('新畫家Artist')).toBe('')
    expect(validateArtistName('John Doe')).toBe('只能使用英文字母或中文字。')
    expect(validateArtistName('ABCDEFGHIJK')).toBe('名稱最多 10 個字。')
  })

  it('validates and saves all five custom artist names', async () => {
    const wrapper = mount(SettingsModal)
    const inputs = wrapper.findAll('.artist-name-field input')
    expect(inputs).toHaveLength(5)

    await inputs[0]!.setValue('ABCDEFGHIJK')
    expect(wrapper.text()).toContain('名稱最多 10 個字。')
    expect(wrapper.get('button.button--primary').attributes('disabled')).toBeDefined()

    await inputs[0]!.setValue('新畫家Artist')
    await wrapper.get('button.button--primary').trigger('click')

    expect(artistDisplayName('yellow')).toBe('新畫家Artist')
    expect(wrapper.emitted('close')).toHaveLength(1)

    const yellowCard = createDeck().find((card) => card.artistId === 'yellow')
    if (!yellowCard) throw new Error('yellow card not found')
    const artwork = mount(ArtworkCard, { props: { card: yellowCard, disabled: true } })
    expect(artwork.text()).toContain('新畫家Artist')
  })

  it('assigns a distinct artwork composition to every artist', () => {
    const cards = ARTIST_IDS.map((artistId) =>
      createDeck().find((card) => card.artistId === artistId),
    )
    expect(cards.every(Boolean)).toBe(true)

    const classes = cards.map((card) => {
      if (!card) throw new Error('artist card not found')
      return mount(ArtworkCard, { props: { card } }).get('.art-card').classes()
    })

    ARTIST_IDS.forEach((artistId, index) => {
      expect(classes[index]).toContain(`art-card--artist-${artistId}`)
    })
    expect(new Set(classes.map((classList) => classList.join(' '))).size).toBe(ARTIST_IDS.length)
  })
})
