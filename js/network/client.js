/**
 * Client Logic - Connect to host and receive updates
 */

import { MSG_TYPES } from '../config.js';
import store from '../state/store.js';
import gameState, { PHASES } from '../state/game-state.js';
import peerManager from './peer-manager.js';
import { setGameIdInUrl, removeGameIdFromUrl } from '../utils/url.js';
import { showToast, showError } from '../ui/components/toast.js';

class Client {
    constructor() {
        this.hostId = null;
    }

    /**
     * Join an existing game
     * @param {string} gameId - Game ID (host's peer ID)
     * @param {string} playerName - Player's name
     * @returns {Promise<void>}
     */
    async joinGame(gameId, playerName) {
        try {
            // Initialize our peer
            await peerManager.initialize();

            // Connect to host
            await peerManager.connectTo(gameId);

            this.hostId = gameId;

            // Set up state
            store.update({
                isHost: false,
                gameId: gameId,
                'localPlayer.id': peerManager.getPeerId(),
                'localPlayer.name': playerName,
                'localPlayer.isReady': false
            });

            // Update URL
            setGameIdInUrl(gameId);

            // Set up message handlers
            this.setupMessageHandlers();

            // Send join message to host
            peerManager.send(gameId, {
                type: MSG_TYPES.PLAYER_JOIN,
                name: playerName
            });

            // Transition to lobby
            gameState.transition(PHASES.LOBBY);

        } catch (err) {
            console.error('Failed to join game:', err);
            throw err;
        }
    }

    /**
     * Set up message handlers for client
     */
    setupMessageHandlers() {
        // Handle game state sync
        peerManager.on(MSG_TYPES.GAME_STATE, (data) => {
            store.applyGameState(data.state);
        });

        // Handle settings update
        peerManager.on(MSG_TYPES.SETTINGS_UPDATE, (data) => {
            store.set('settings', data.settings);
        });

        // Handle player leave
        peerManager.on(MSG_TYPES.PLAYER_LEAVE, (data) => {
            const players = store.get('players').filter(p => p.id !== data.playerId);
            store.set('players', players);
        });

        // Handle round start
        peerManager.on(MSG_TYPES.ROUND_START, (data) => {
            store.update({
                currentRound: data.round,
                currentLetter: data.letter,
                categories: data.categories,
                timerRemaining: data.timerSeconds,
                timerRunning: true,
                answers: {},
                votes: {}
            });

            // Reset ready state
            store.merge('localPlayer', { isReady: false });

            gameState.transition(PHASES.ANSWERING);
        });

        // Handle timer sync
        peerManager.on(MSG_TYPES.TIMER_SYNC, (data) => {
            store.set('timerRemaining', data.remaining);
        });

        // Handle all answers revealed
        peerManager.on(MSG_TYPES.ALL_ANSWERS, (data) => {
            store.set('answers', data.answers);
            store.set('timerRunning', false);
            store.merge('localPlayer', { isReady: false });
            gameState.transition(PHASES.VOTING);
        });

        // Handle vote updates
        peerManager.on(MSG_TYPES.VOTE_UPDATE, (data) => {
            store.set('votes', data.votes);
        });

        // Handle round results
        peerManager.on(MSG_TYPES.ROUND_RESULTS, (data) => {
            store.set('roundResults', data.results);
            store.set('scores', data.scores);

            // Update player scores
            const players = store.get('players').map(p => ({
                ...p,
                score: data.scores[p.id] || 0,
                isReady: false
            }));
            store.set('players', players);
            store.merge('localPlayer', { isReady: false });

            gameState.transition(PHASES.RESULTS);
        });

        // Handle game over
        peerManager.on(MSG_TYPES.GAME_OVER, (data) => {
            store.set('scores', data.scores);
            store.set('players', data.players);
            gameState.transition(PHASES.GAME_OVER);
        });

        // Handle errors
        peerManager.on(MSG_TYPES.ERROR, (data) => {
            console.error('Server error:', data.message);
            showError(data.message);
        });

        // Handle disconnection from host
        peerManager.on('disconnection', ({ peerId }) => {
            if (peerId === this.hostId) {
                console.log('Disconnected from host');
                showError('Host has left the game');
                this.handleHostDisconnect();
            }
        });

        // Handle being kicked
        peerManager.on(MSG_TYPES.KICK, (data) => {
            console.log('Kicked from game');
            showError(data?.reason || 'You were removed from the game');
            this.leaveGame();
        });
    }

    /**
     * Update player name
     */
    updateName(name) {
        store.set('localPlayer.name', name);

        peerManager.send(this.hostId, {
            type: MSG_TYPES.PLAYER_UPDATE,
            name: name
        });
    }

    /**
     * Toggle ready status
     */
    toggleReady() {
        const localPlayer = store.get('localPlayer');
        const newReadyState = !localPlayer.isReady;

        store.set('localPlayer.isReady', newReadyState);

        peerManager.send(this.hostId, {
            type: MSG_TYPES.PLAYER_READY,
            isReady: newReadyState
        });
    }

    /**
     * Submit answers
     */
    submitAnswers(answers) {
        store.merge('localPlayer', { isReady: true });

        peerManager.send(this.hostId, {
            type: MSG_TYPES.ANSWERS_SUBMIT,
            answers: answers
        });
    }

    /**
     * Submit a vote
     */
    vote(categoryIndex, answer, voteType) {
        peerManager.send(this.hostId, {
            type: MSG_TYPES.VOTE,
            categoryIndex,
            answer,
            voteType
        });
    }

    /**
     * Mark voting as done
     */
    finishVoting() {
        store.merge('localPlayer', { isReady: true });

        peerManager.send(this.hostId, {
            type: MSG_TYPES.VOTING_DONE
        });
    }

    /**
     * Mark ready for next round
     */
    readyForNextRound() {
        store.merge('localPlayer', { isReady: true });

        peerManager.send(this.hostId, {
            type: MSG_TYPES.NEXT_ROUND
        });
    }

    /**
     * Handle host disconnecting
     */
    handleHostDisconnect() {
        // Clean up and go back to home
        peerManager.destroy();
        store.reset();
        removeGameIdFromUrl();
        gameState.forcePhase(PHASES.HOME);
    }

    /**
     * Leave the game
     */
    leaveGame() {
        peerManager.destroy();
        store.reset();
        removeGameIdFromUrl();
        gameState.forcePhase(PHASES.HOME);
    }

    /**
     * Clean up client resources
     */
    destroy() {
        peerManager.destroy();
    }
}

export const client = new Client();
export default client;
