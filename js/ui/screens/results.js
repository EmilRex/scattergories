/**
 * Results Screen - Round scores, leaderboard
 */

import store from '../../state/store.js';
import host from '../../network/host.js';
import client from '../../network/client.js';

class ResultsScreen {
    constructor() {
        this.elements = {};
    }

    /**
     * Initialize results screen
     */
    init() {
        this.cacheElements();
        this.bindEvents();
        this.subscribeToState();
    }

    cacheElements() {
        this.elements = {
            resultsRound: document.getElementById('results-round'),
            roundScores: document.getElementById('round-scores'),
            leaderboardList: document.getElementById('leaderboard-list'),
            nextRoundBtn: document.getElementById('btn-next-round')
        };
    }

    bindEvents() {
        // Next round button
        this.elements.nextRoundBtn?.addEventListener('click', () => {
            if (store.get('isHost')) {
                host.readyForNextRound();
            } else {
                client.readyForNextRound();
            }
        });
    }

    subscribeToState() {
        // Render results when entering results phase
        store.subscribe('gamePhase', (phase) => {
            if (phase === 'RESULTS') {
                this.renderResults();
            }
        });

        // Update button text based on round
        store.subscribe('currentRound', (round) => {
            const totalRounds = store.get('totalRounds');
            if (this.elements.nextRoundBtn) {
                if (round >= totalRounds) {
                    this.elements.nextRoundBtn.textContent = 'SEE FINAL RESULTS';
                } else {
                    this.elements.nextRoundBtn.textContent = 'NEXT ROUND';
                }
            }
        });

        // Update button state
        store.subscribe('localPlayer.isReady', (isReady) => {
            if (this.elements.nextRoundBtn) {
                if (isReady) {
                    this.elements.nextRoundBtn.textContent = 'WAITING...';
                    this.elements.nextRoundBtn.disabled = true;
                } else {
                    const round = store.get('currentRound');
                    const totalRounds = store.get('totalRounds');
                    this.elements.nextRoundBtn.textContent = round >= totalRounds ? 'SEE FINAL RESULTS' : 'NEXT ROUND';
                    this.elements.nextRoundBtn.disabled = false;
                }
            }
        });
    }

    renderResults() {
        const roundResults = store.get('roundResults');
        const currentRound = store.get('currentRound');
        const categories = store.get('categories');
        const players = store.get('players');
        const scores = store.get('scores');

        // Update round number
        if (this.elements.resultsRound) {
            this.elements.resultsRound.textContent = currentRound;
        }

        // Build player lookup
        const playerNames = {};
        players.forEach(p => {
            playerNames[p.id] = p.name;
        });

        // Render round scores
        this.renderRoundScores(roundResults, categories, playerNames);

        // Render leaderboard
        this.renderLeaderboard(players, scores);
    }

    renderRoundScores(results, categories, playerNames) {
        if (!this.elements.roundScores || !results) return;

        let html = '<div class="scores-by-category stagger-children">';

        results.categoryResults.forEach((catResult, index) => {
            html += `
                <div class="category-results">
                    <h4>${index + 1}. ${this.escapeHtml(categories[index])}</h4>
                    <div class="answers-list">
            `;

            catResult.answers.forEach(answer => {
                const isValid = answer.netVotes > 0;
                const playerName = playerNames[answer.playerId] || 'Unknown';
                const pointsText = isValid ? `+${answer.points}` : '0';

                html += `
                    <div class="score-entry ${isValid ? 'valid' : 'invalid'}">
                        <span class="entry-answer">${this.escapeHtml(answer.answer)}</span>
                        <span class="entry-player">(${this.escapeHtml(playerName)})</span>
                        <span class="entry-votes">[${answer.netVotes >= 0 ? '+' : ''}${answer.netVotes}]</span>
                        <span class="entry-points">${pointsText}</span>
                    </div>
                `;
            });

            html += '</div></div>';
        });

        html += '</div>';

        // Add round summary
        html += '<div class="round-summary">';
        html += '<h4>ROUND SCORES</h4>';

        const sortedPlayers = Object.entries(results.playerScores)
            .sort((a, b) => b[1] - a[1])
            .map(([playerId, score]) => ({
                name: playerNames[playerId] || 'Unknown',
                score
            }));

        sortedPlayers.forEach(({ name, score }) => {
            html += `<div class="round-player-score"><span>${this.escapeHtml(name)}</span><span>+${score}</span></div>`;
        });

        html += '</div>';

        this.elements.roundScores.innerHTML = html;
    }

    renderLeaderboard(players, scores) {
        if (!this.elements.leaderboardList) return;

        // Sort players by total score
        const sortedPlayers = [...players].sort((a, b) => {
            const scoreA = scores[a.id] || 0;
            const scoreB = scores[b.id] || 0;
            return scoreB - scoreA;
        });

        this.elements.leaderboardList.innerHTML = sortedPlayers.map((player, index) => {
            const score = scores[player.id] || 0;
            const position = index + 1;
            let positionClass = '';
            if (position === 1) positionClass = 'first';
            else if (position === 2) positionClass = 'second';
            else if (position === 3) positionClass = 'third';

            return `
                <li class="${positionClass}">
                    <span class="player-name">${this.escapeHtml(player.name)}</span>
                    <span class="player-score">${score} pts</span>
                </li>
            `;
        }).join('');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

export const resultsScreen = new ResultsScreen();
export default resultsScreen;
