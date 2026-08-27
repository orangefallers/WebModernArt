import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { decideAI, type AIDecision } from '@/ai/ai-controller'
import {
  continueAfterRound,
  currentActorId,
  passBid,
  placeBid,
  playCard,
  respondToDouble,
  respondToFixedPrice,
  setFixedPrice,
  skipEmptyAuctioneer,
  startGame,
  submitSealedBid,
} from '@/domain/game-engine'
import { GameRuleError, type AuctionResult, type GameState, type PlayerId } from '@/domain/model'
import { clearSave, hasSavedGame, loadGame, saveGame } from '@/services/persistence.service'

const wait = (milliseconds: number) =>
  new Promise((resolve) => window.setTimeout(resolve, milliseconds))

export const useGameStore = defineStore('game', () => {
  const game = ref<GameState | null>(null)
  const savedGameAvailable = ref(hasSavedGame())
  const thinkingPlayerId = ref<PlayerId | null>(null)
  const auctionResultNotice = ref<AuctionResult | null>(null)
  const errorMessage = ref('')
  let aiRunToken = 0

  const human = computed(() => game.value?.players.find((player) => player.kind === 'human'))
  const actorId = computed(() => (game.value ? currentActorId(game.value) : undefined))
  const actor = computed(() => game.value?.players.find((player) => player.id === actorId.value))
  const isHumanTurn = computed(() => actor.value?.kind === 'human')

  function clearAuctionResultNotice(): void {
    auctionResultNotice.value = null
  }

  function showAuctionResultNotice(result: AuctionResult): void {
    auctionResultNotice.value = result
  }

  function commit(nextState: GameState): void {
    const previousAuctionResultId = game.value?.lastAuctionResult?.id
    game.value = nextState
    saveGame(nextState)
    savedGameAvailable.value = true
    errorMessage.value = ''
    if (nextState.lastAuctionResult && nextState.lastAuctionResult.id !== previousAuctionResultId) {
      showAuctionResultNotice(nextState.lastAuctionResult)
    }
  }

  function handleError(error: unknown): void {
    errorMessage.value =
      error instanceof GameRuleError ? error.message : '發生未預期的錯誤，請再試一次。'
  }

  function begin(aiCount: 2 | 3 | 4): void {
    aiRunToken += 1
    clearAuctionResultNotice()
    commit(startGame({ aiCount }))
    void runAI()
  }

  function resume(): boolean {
    const restored = loadGame()
    if (!restored) return false
    aiRunToken += 1
    game.value = restored
    auctionResultNotice.value = restored.lastAuctionResult ?? null
    void runAI()
    return true
  }

  function quit(): void {
    aiRunToken += 1
    clearAuctionResultNotice()
    game.value = null
    thinkingPlayerId.value = null
  }

  function discard(): void {
    quit()
    clearSave()
    savedGameAvailable.value = false
  }

  function restart(aiCount?: 2 | 3 | 4): void {
    const currentAI = (game.value?.players.length ?? 4) - 1
    clearSave()
    savedGameAvailable.value = false
    begin(aiCount ?? (Math.min(4, Math.max(2, currentAI)) as 2 | 3 | 4))
  }

  function applyHuman(action: () => GameState): void {
    try {
      commit(action())
      void runAI()
    } catch (error) {
      handleError(error)
    }
  }

  function humanPlayCard(cardId: string): void {
    if (!game.value || !human.value) return
    applyHuman(() => playCard(game.value!, human.value!.id, cardId))
  }

  function humanDouble(cardId?: string): void {
    if (!game.value || !human.value) return
    applyHuman(() => respondToDouble(game.value!, human.value!.id, cardId))
  }

  function humanBid(amount: number): void {
    if (!game.value || !human.value) return
    applyHuman(() => placeBid(game.value!, human.value!.id, amount))
  }

  function humanPass(): void {
    if (!game.value || !human.value) return
    applyHuman(() => passBid(game.value!, human.value!.id))
  }

  function humanSealedBid(amount: number): void {
    if (!game.value || !human.value) return
    applyHuman(() => submitSealedBid(game.value!, human.value!.id, amount))
  }

  function humanSetPrice(amount: number): void {
    if (!game.value || !human.value) return
    applyHuman(() => setFixedPrice(game.value!, human.value!.id, amount))
  }

  function humanFixedResponse(accept: boolean): void {
    if (!game.value || !human.value) return
    applyHuman(() => respondToFixedPrice(game.value!, human.value!.id, accept))
  }

  function continueRound(): void {
    if (!game.value) return
    applyHuman(() => continueAfterRound(game.value!))
  }

  function executeAI(state: GameState, playerId: PlayerId, decision: AIDecision): GameState {
    state.rngState = decision.rngState
    switch (decision.type) {
      case 'play-card':
        return playCard(state, playerId, decision.cardId)
      case 'skip-empty':
        return skipEmptyAuctioneer(state, playerId)
      case 'double':
        return respondToDouble(state, playerId, decision.cardId)
      case 'bid':
        return placeBid(state, playerId, decision.amount)
      case 'pass':
        return passBid(state, playerId)
      case 'sealed':
        return submitSealedBid(state, playerId, decision.amount)
      case 'set-price':
        return setFixedPrice(state, playerId, decision.amount)
      case 'fixed-response':
        return respondToFixedPrice(state, playerId, decision.accept)
    }
  }

  async function runAI(): Promise<void> {
    const token = ++aiRunToken
    while (game.value && token === aiRunToken) {
      if (game.value.phase === 'round-result' || game.value.phase === 'game-over') break
      const currentId = currentActorId(game.value)
      const player = game.value.players.find((candidate) => candidate.id === currentId)
      if (!player || player.kind !== 'ai') break
      thinkingPlayerId.value = player.id
      await wait(420)
      if (!game.value || token !== aiRunToken) break
      try {
        const decision = decideAI(game.value, player.id)
        commit(executeAI(game.value, player.id, decision))
      } catch (error) {
        handleError(error)
        break
      }
    }
    if (token === aiRunToken) thinkingPlayerId.value = null
  }

  return {
    game,
    human,
    actor,
    actorId,
    isHumanTurn,
    thinkingPlayerId,
    auctionResultNotice,
    savedGameAvailable,
    errorMessage,
    begin,
    resume,
    quit,
    discard,
    restart,
    humanPlayCard,
    humanDouble,
    humanBid,
    humanPass,
    humanSealedBid,
    humanSetPrice,
    humanFixedResponse,
    continueRound,
  }
})
