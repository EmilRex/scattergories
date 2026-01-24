/**
 * Host Logic - Game authority and state broadcasting
 * The host manages all game state and validates client actions
 */

import { MSG_TYPES, TIMER_SYNC_INTERVAL, SETTINGS, MAX_PLAYERS } from '../config.js';
import store from '../state/store.js';
import gameState, { PHASES } from '../state/game-state.js';
import peerManager from './peer-manager.js';
import { getCategories } from '../game/categories.js';
import { selectLetter } from '../game/round.js';
import { calculateRoundResults } from '../game/scoring.js';
import { setGameIdInUrl } from '../utils/url.js';

class Host {
    constructor() {
        this.timerInterval = null;
        this.syncInterval = null;
        this.usedLetters = [];
    }

    /**
     * Create a new game as host
     * @param {string} playerName - Host's player name
     * @returns {Promise<string>} Game ID
     */
    async createGame(playerName) {
        // Generate a short game ID
        const gameId = this.generateShortId();

        try {
            // Initialize peer with game ID as peer ID
            await peerManager.initialize(gameId);

            // Set up host state
            store.update({
                isHost: true,
                gameId: gameId,
                'localPlayer.id': gameId,
                'localPlayer.name': playerName,
                'localPlayer.isReady': false,
                players: [{
                    id: gameId,
                    name: playerName,
                    isReady: false,
                    isHost: true,
                    score: 0
                }]
            });

            // Update URL with game ID
            setGameIdInUrl(gameId);

            // Set up message handlers
            this.setupMessageHandlers();

            // Transition to lobby
            gameState.transition(PHASES.LOBBY);

            return gameId;
        } catch (err) {
            console.error('Failed to create game:', err);
            throw err;
        }
    }

    /**
     * Generate a short, easy-to-share game ID
     */
    generateShortId() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let id = '';
        for (let i = 0; i < 6; i++) {
            id += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return id;
    }

    /**
     * Set up message handlers for host
     */
    setupMessageHandlers() {
        // Handle new connections
        peerManager.on('connection', ({ peerId }) => {
            // Check player limit
            if (store.get('players').length >= MAX_PLAYERS) {
                peerManager.send(peerId, {
                    type: MSG_TYPES.ERROR,
                    message: 'Game is full'
                });
                return;
            }

            // Check if game already started
            if (gameState.isPlaying()) {
                peerManager.send(peerId, {
                    type: MSG_TYPES.ERROR,
                    message: 'Game already in progress'
                });
                return;
            }
        });

        // Handle player join
        peerManager.on(MSG_TYPES.PLAYER_JOIN, (data, fromPeerId) => {
            this.handlePlayerJoin(fromPeerId, data.name);
        });

        // Handle player disconnect
        peerManager.on('disconnection', ({ peerId }) => {
            this.handlePlayerLeave(peerId);
        });

        // Handle player ready status
        peerManager.on(MSG_TYPES.PLAYER_READY, (data, fromPeerId) => {
            this.handlePlayerReady(fromPeerId, data.isReady);
        });

        // Handle player name update
        peerManager.on(MSG_TYPES.PLAYER_UPDATE, (data, fromPeerId) => {
            this.handlePlayerUpdate(fromPeerId, data);
        });

        // Handle answer submission
        peerManager.on(MSG_TYPES.ANSWERS_SUBMIT, (data, fromPeerId) => {
            this.handleAnswersSubmit(fromPeerId, data.answers);
        });

        // Handle votes
        peerManager.on(MSG_TYPES.VOTE, (data, fromPeerId) => {
            this.handleVote(fromPeerId, data);
        });

        // Handle voting done
        peerManager.on(MSG_TYPES.VOTING_DONE, (data, fromPeerId) => {
            this.handleVotingDone(fromPeerId);
        });

        // Handle next round ready
        peerManager.on(MSG_TYPES.NEXT_ROUND, (data, fromPeerId) => {
            this.handleNextRoundReady(fromPeerId);
        });
    }

    /**
     * Handle a new player joining
     */
    handlePlayerJoin(peerId, name) {
        const players = store.get('players');

        // Check if player already exists (reconnect)
        const existingIndex = players.findIndex(p => p.id === peerId);
        if (existingIndex >= 0) {
            players[existingIndex].name = name;
            players[existingIndex].isReady = false;
        } else {
            players.push({
                id: peerId,
                name: name,
                isReady: false,
                isHost: false,
                score: 0
            });
        }

        store.set('players', [...players]);

        // Send current game state to new player
        peerManager.send(peerId, {
            type: MSG_TYPES.GAME_STATE,
            state: store.getGameState()
        });

        // Broadcast updated player list to all
        this.broadcastState();
    }

    /**
     * Handle player leaving
     */
    handlePlayerLeave(peerId) {
        const players = store.get('players').filter(p => p.id !== peerId);
        store.set('players', players);

        // Broadcast updated player list
        peerManager.broadcast({
            type: MSG_TYPES.PLAYER_LEAVE,
            playerId: peerId
        });

        this.broadcastState();
    }

    /**
     * Handle player ready status change
     */
    handlePlayerReady(peerId, isReady) {
        const players = store.get('players');
        const player = players.find(p => p.id === peerId);
        if (player) {
            player.isReady = isReady;
            store.set('players', [...players]);
            this.broadcastState();

            // Check if all players are ready
            this.checkAllReady();
        }
    }

    /**
     * Handle player name/info update
     */
    handlePlayerUpdate(peerId, data) {
        const players = store.get('players');
        const player = players.find(p => p.id === peerId);
        if (player) {
            if (data.name) player.name = data.name;
            store.set('players', [...players]);
            this.broadcastState();
        }
    }

    /**
     * Update game settings (host only)
     */
    updateSettings(key, value) {
        const settings = store.get('settings');

        switch (key) {
            case 'rounds':
                value = Math.max(SETTINGS.ROUNDS.MIN, Math.min(SETTINGS.ROUNDS.MAX, value));
                break;
            case 'categoriesPerRound':
                value = Math.max(SETTINGS.CATEGORIES.MIN, Math.min(SETTINGS.CATEGORIES.MAX, value));
                break;
            case 'timerSeconds':
                value = Math.max(SETTINGS.TIMER.MIN, Math.min(SETTINGS.TIMER.MAX, value));
                break;
        }

        settings[key] = value;
        store.set('settings', { ...settings });

        // Broadcast settings update
        peerManager.broadcast({
            type: MSG_TYPES.SETTINGS_UPDATE,
            settings: settings
        });
    }

    /**
     * Toggle host's ready state
     */
    toggleReady() {
        const localPlayer = store.get('localPlayer');
        localPlayer.isReady = !localPlayer.isReady;
        store.set('localPlayer', { ...localPlayer });

        // Update in players list
        const players = store.get('players');
        const hostPlayer = players.find(p => p.isHost);
        if (hostPlayer) {
            hostPlayer.isReady = localPlayer.isReady;
            store.set('players', [...players]);
        }

        this.broadcastState();
        this.checkAllReady();
    }

    /**
     * Check if all players are ready to proceed
     */
    checkAllReady() {
        const players = store.get('players');
        const phase = store.get('gamePhase');

        // Need at least 2 players
        if (players.length < 2) return;

        const allReady = players.every(p => p.isReady);
        if (!allReady) return;

        // Handle based on current phase
        switch (phase) {
            case PHASES.LOBBY:
                this.startGame();
                break;
            case PHASES.ANSWERING:
                this.endAnswerPhase();
                break;
            case PHASES.VOTING:
                this.endVotingPhase();
                break;
            case PHASES.RESULTS:
                this.proceedFromResults();
                break;
        }
    }

    /**
     * Start the game
     */
    startGame() {
        const settings = store.get('settings');

        store.update({
            totalRounds: settings.rounds,
            currentRound: 0,
            scores: {}
        });

        // Initialize scores for all players
        const scores = {};
        store.get('players').forEach(p => {
            scores[p.id] = 0;
        });
        store.set('scores', scores);

        this.usedLetters = [];
        this.startRound();
    }

    /**
     * Start a new round
     */
    startRound() {
        const currentRound = store.get('currentRound') + 1;
        const settings = store.get('settings');

        // Select random letter (not used before)
        const letter = selectLetter(this.usedLetters);
        this.usedLetters.push(letter);

        // Get categories for this round
        const categories = getCategories(settings.categoriesPerRound);

        // Reset player ready states
        const players = store.get('players').map(p => ({ ...p, isReady: false }));

        store.update({
            currentRound,
            currentLetter: letter,
            categories,
            players,
            answers: {},
            votes: {},
            timerRemaining: settings.timerSeconds,
            timerRunning: true
        });

        // Also reset local player ready
        store.merge('localPlayer', { isReady: false });

        // Transition to answering phase
        gameState.transition(PHASES.ANSWERING);

        // Broadcast round start
        peerManager.broadcast({
            type: MSG_TYPES.ROUND_START,
            round: currentRound,
            letter,
            categories,
            timerSeconds: settings.timerSeconds
        });

        // Start timer
        this.startTimer();
    }

    /**
     * Start the countdown timer
     */
    startTimer() {
        // Clear any existing timer
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }

        const startTime = Date.now();
        const duration = store.get('settings').timerSeconds * 1000;

        this.timerInterval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const remaining = Math.max(0, Math.ceil((duration - elapsed) / 1000));

            store.set('timerRemaining', remaining);

            if (remaining <= 0) {
                this.endAnswerPhase();
            }
        }, 100);

        // Sync timer with clients periodically
        this.syncInterval = setInterval(() => {
            peerManager.broadcast({
                type: MSG_TYPES.TIMER_SYNC,
                remaining: store.get('timerRemaining')
            });
        }, TIMER_SYNC_INTERVAL);
    }

    /**
     * Stop the timer
     */
    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
        store.set('timerRunning', false);
    }

    /**
     * Handle answer submission from a player
     */
    handleAnswersSubmit(playerId, playerAnswers) {
        const answers = store.get('answers');
        answers[playerId] = playerAnswers;
        store.set('answers', { ...answers });

        // Mark player as ready (done answering)
        this.handlePlayerReady(playerId, true);
    }

    /**
     * Submit host's own answers
     */
    submitAnswers(playerAnswers) {
        const hostId = store.get('localPlayer').id;
        this.handleAnswersSubmit(hostId, playerAnswers);
    }

    /**
     * End the answer phase
     */
    endAnswerPhase() {
        this.stopTimer();

        // Reset ready states for voting
        const players = store.get('players').map(p => ({ ...p, isReady: false }));
        store.set('players', players);
        store.merge('localPlayer', { isReady: false });

        // Transition to voting
        gameState.transition(PHASES.VOTING);

        // Broadcast all answers
        peerManager.broadcast({
            type: MSG_TYPES.ALL_ANSWERS,
            answers: store.get('answers')
        });

        this.broadcastState();
    }

    /**
     * Handle vote from a player
     */
    handleVote(playerId, voteData) {
        const { categoryIndex, answer, voteType } = voteData;
        const votes = store.get('votes');

        // Initialize vote structure if needed
        if (!votes[categoryIndex]) {
            votes[categoryIndex] = {};
        }
        if (!votes[categoryIndex][answer]) {
            votes[categoryIndex][answer] = { upvotes: [], downvotes: [] };
        }

        const answerVotes = votes[categoryIndex][answer];

        // Remove any existing vote from this player
        answerVotes.upvotes = answerVotes.upvotes.filter(id => id !== playerId);
        answerVotes.downvotes = answerVotes.downvotes.filter(id => id !== playerId);

        // Add new vote
        if (voteType === 'up') {
            answerVotes.upvotes.push(playerId);
        } else if (voteType === 'down') {
            answerVotes.downvotes.push(playerId);
        }
        // voteType === 'none' removes the vote

        store.set('votes', { ...votes });

        // Broadcast vote update
        peerManager.broadcast({
            type: MSG_TYPES.VOTE_UPDATE,
            votes: votes
        });
    }

    /**
     * Record a vote from the host
     */
    vote(categoryIndex, answer, voteType) {
        const hostId = store.get('localPlayer').id;
        this.handleVote(hostId, { categoryIndex, answer, voteType });
    }

    /**
     * Handle player done voting
     */
    handleVotingDone(playerId) {
        this.handlePlayerReady(playerId, true);
    }

    /**
     * Mark host as done voting
     */
    finishVoting() {
        const hostId = store.get('localPlayer').id;
        this.handleVotingDone(hostId);
    }

    /**
     * End the voting phase
     */
    endVotingPhase() {
        // Calculate results
        const results = calculateRoundResults(
            store.get('answers'),
            store.get('votes'),
            store.get('categories'),
            store.get('currentLetter')
        );

        // Update scores
        const scores = store.get('scores');
        for (const [playerId, roundScore] of Object.entries(results.playerScores)) {
            scores[playerId] = (scores[playerId] || 0) + roundScore;
        }
        store.set('scores', { ...scores });

        // Update player scores in player list
        const players = store.get('players').map(p => ({
            ...p,
            score: scores[p.id] || 0,
            isReady: false
        }));
        store.set('players', players);
        store.merge('localPlayer', { isReady: false });

        store.set('roundResults', results);

        // Transition to results
        gameState.transition(PHASES.RESULTS);

        // Broadcast results
        peerManager.broadcast({
            type: MSG_TYPES.ROUND_RESULTS,
            results,
            scores
        });

        this.broadcastState();
    }

    /**
     * Handle player ready for next round
     */
    handleNextRoundReady(playerId) {
        this.handlePlayerReady(playerId, true);
    }

    /**
     * Mark host ready for next round
     */
    readyForNextRound() {
        const hostId = store.get('localPlayer').id;
        this.handleNextRoundReady(hostId);
    }

    /**
     * Proceed from results to next round or game over
     */
    proceedFromResults() {
        const currentRound = store.get('currentRound');
        const totalRounds = store.get('totalRounds');

        if (currentRound >= totalRounds) {
            this.endGame();
        } else {
            this.startRound();
        }
    }

    /**
     * End the game
     */
    endGame() {
        gameState.transition(PHASES.GAME_OVER);

        peerManager.broadcast({
            type: MSG_TYPES.GAME_OVER,
            scores: store.get('scores'),
            players: store.get('players')
        });
    }

    /**
     * Broadcast current game state to all clients
     */
    broadcastState() {
        peerManager.broadcast({
            type: MSG_TYPES.GAME_STATE,
            state: store.getGameState()
        });
    }

    /**
     * Reset for a new game (play again)
     */
    playAgain() {
        // Reset ready states
        const players = store.get('players').map(p => ({
            ...p,
            isReady: false,
            score: 0
        }));

        store.update({
            players,
            currentRound: 0,
            answers: {},
            votes: {},
            scores: {},
            roundResults: []
        });

        store.merge('localPlayer', { isReady: false });

        this.usedLetters = [];

        gameState.transition(PHASES.LOBBY);
        this.broadcastState();
    }

    /**
     * Clean up host resources
     */
    destroy() {
        this.stopTimer();
        peerManager.destroy();
    }
}

export const host = new Host();
export default host;
