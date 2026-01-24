/**
 * Configuration constants
 */

// PeerJS configuration
// Uses public PeerJS cloud server by default
export const PEER_CONFIG = {
    // Use default PeerJS cloud server
    // For production, consider running your own PeerServer
    debug: 1, // 0 = no logs, 1 = errors, 2 = warnings, 3 = all
    config: {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
        ]
    }
};

// Game settings constraints
export const SETTINGS = {
    ROUNDS: {
        MIN: 1,
        MAX: 10,
        DEFAULT: 3
    },
    CATEGORIES: {
        MIN: 6,
        MAX: 12,
        DEFAULT: 12
    },
    TIMER: {
        MIN: 60,
        MAX: 300,
        DEFAULT: 180,
        STEP: 30
    }
};

// Timer sync interval (ms)
export const TIMER_SYNC_INTERVAL = 5000;

// Letters to exclude from random selection
export const EXCLUDED_LETTERS = ['Q', 'X', 'Z'];

// All available letters
export const AVAILABLE_LETTERS = 'ABCDEFGHIJKLMNOPRSTUVWY'.split('');

// Message types for P2P communication
export const MSG_TYPES = {
    // Connection
    PLAYER_JOIN: 'PLAYER_JOIN',
    PLAYER_LEAVE: 'PLAYER_LEAVE',
    PLAYER_UPDATE: 'PLAYER_UPDATE',

    // Lobby
    GAME_STATE: 'GAME_STATE',
    SETTINGS_UPDATE: 'SETTINGS_UPDATE',
    PLAYER_READY: 'PLAYER_READY',

    // Game flow
    GAME_START: 'GAME_START',
    ROUND_START: 'ROUND_START',
    TIMER_SYNC: 'TIMER_SYNC',
    TIMER_END: 'TIMER_END',

    // Answers
    ANSWERS_SUBMIT: 'ANSWERS_SUBMIT',
    ALL_ANSWERS: 'ALL_ANSWERS',

    // Voting
    VOTE: 'VOTE',
    VOTE_UPDATE: 'VOTE_UPDATE',
    VOTING_DONE: 'VOTING_DONE',

    // Results
    ROUND_RESULTS: 'ROUND_RESULTS',
    NEXT_ROUND: 'NEXT_ROUND',
    GAME_OVER: 'GAME_OVER',

    // System
    PING: 'PING',
    PONG: 'PONG',
    ERROR: 'ERROR',
    KICK: 'KICK'
};

// Timing constants
export const TIMING = {
    TOAST_DURATION: 3000,
    SCREEN_TRANSITION: 300,
    RECONNECT_DELAY: 2000,
    RECONNECT_ATTEMPTS: 3,
    PING_INTERVAL: 10000
};

// Maximum players per game
export const MAX_PLAYERS = 8;

// Username constraints
export const USERNAME = {
    MIN_LENGTH: 1,
    MAX_LENGTH: 12
};

// Scoring
export const SCORING = {
    // Points for a valid unique answer
    UNIQUE_ANSWER: 2,
    // Points for a valid answer (shared with others)
    VALID_ANSWER: 1,
    // Minimum net votes required for answer to count
    MIN_NET_VOTES: 1
};

export default {
    PEER_CONFIG,
    SETTINGS,
    TIMER_SYNC_INTERVAL,
    EXCLUDED_LETTERS,
    AVAILABLE_LETTERS,
    MSG_TYPES,
    TIMING,
    MAX_PLAYERS,
    USERNAME,
    SCORING
};
