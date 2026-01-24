/**
 * Voting Screen - Display all answers, upvote/downvote
 */

import store from '../../state/store.js';
import host from '../../network/host.js';
import client from '../../network/client.js';

class VotingScreen {
    constructor() {
        this.elements = {};
        this.localVotes = {}; // Track local player's votes
    }

    /**
     * Initialize voting screen
     */
    init() {
        this.cacheElements();
        this.bindEvents();
        this.subscribeToState();
    }

    cacheElements() {
        this.elements = {
            votingContainer: document.getElementById('voting-container'),
            finishBtn: document.getElementById('btn-finish-voting')
        };
    }

    bindEvents() {
        // Finish voting
        this.elements.finishBtn?.addEventListener('click', () => {
            if (store.get('isHost')) {
                host.finishVoting();
            } else {
                client.finishVoting();
            }
        });
    }

    subscribeToState() {
        // Render voting UI when entering voting phase
        store.subscribe('gamePhase', (phase) => {
            if (phase === 'VOTING') {
                this.localVotes = {};
                this.renderVotingUI();
            }
        });

        // Update vote counts when votes change
        store.subscribe('votes', (votes) => {
            this.updateVoteCounts(votes);
        });

        // Update finish button state
        store.subscribe('localPlayer.isReady', (isReady) => {
            if (this.elements.finishBtn) {
                if (isReady) {
                    this.elements.finishBtn.textContent = 'WAITING...';
                    this.elements.finishBtn.disabled = true;
                } else {
                    this.elements.finishBtn.textContent = 'DONE VOTING';
                    this.elements.finishBtn.disabled = false;
                }
            }
        });
    }

    renderVotingUI() {
        if (!this.elements.votingContainer) return;

        const categories = store.get('categories');
        const answers = store.get('answers');
        const players = store.get('players');
        const localPlayerId = store.get('localPlayer.id');
        const letter = store.get('currentLetter');

        // Build player lookup
        const playerNames = {};
        players.forEach(p => {
            playerNames[p.id] = p.name;
        });

        // Build HTML for each category
        let html = '';

        categories.forEach((category, categoryIndex) => {
            // Collect all answers for this category
            const categoryAnswers = [];

            for (const [playerId, playerAnswers] of Object.entries(answers)) {
                const answer = playerAnswers[categoryIndex];
                if (answer && answer.trim()) {
                    categoryAnswers.push({
                        playerId,
                        playerName: playerNames[playerId] || 'Unknown',
                        answer: answer.trim(),
                        isOwn: playerId === localPlayerId
                    });
                }
            }

            if (categoryAnswers.length === 0) {
                return; // Skip categories with no answers
            }

            html += `
                <div class="voting-category" data-category-index="${categoryIndex}">
                    <h4>${categoryIndex + 1}. ${this.escapeHtml(category)} (${letter})</h4>
                    <div class="voting-answers">
                        ${categoryAnswers.map(a => this.renderVoteCard(categoryIndex, a)).join('')}
                    </div>
                </div>
            `;
        });

        if (!html) {
            html = '<p class="no-answers">No answers submitted this round.</p>';
        }

        this.elements.votingContainer.innerHTML = html;

        // Bind vote button events
        this.bindVoteButtons();
    }

    renderVoteCard(categoryIndex, answerData) {
        const { playerId, playerName, answer, isOwn } = answerData;
        const answerId = `${categoryIndex}-${this.normalizeAnswer(answer)}`;

        return `
            <div class="vote-card ${isOwn ? 'own-answer' : ''}" data-answer-id="${answerId}" data-category="${categoryIndex}" data-answer="${this.escapeAttr(answer)}">
                <div class="vote-answer">
                    <span class="answer-text">${this.escapeHtml(answer)}</span>
                    <span class="vote-player">(${this.escapeHtml(playerName)})</span>
                </div>
                <div class="vote-controls">
                    <button class="vote-btn upvote" data-vote="up" ${isOwn ? 'disabled' : ''}>+</button>
                    <span class="vote-count neutral" data-count>0</span>
                    <button class="vote-btn downvote" data-vote="down" ${isOwn ? 'disabled' : ''}>-</button>
                </div>
            </div>
        `;
    }

    bindVoteButtons() {
        this.elements.votingContainer?.querySelectorAll('.vote-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const card = e.target.closest('.vote-card');
                const categoryIndex = parseInt(card.dataset.category);
                const answer = card.dataset.answer;
                const voteType = e.target.dataset.vote; // 'up' or 'down'

                this.handleVote(categoryIndex, answer, voteType, card);
            });
        });
    }

    handleVote(categoryIndex, answer, voteType, card) {
        const key = `${categoryIndex}-${answer}`;
        const currentVote = this.localVotes[key];

        // Toggle vote or switch vote type
        let newVoteType;
        if (currentVote === voteType) {
            // Clicking same vote removes it
            newVoteType = 'none';
        } else {
            newVoteType = voteType;
        }

        this.localVotes[key] = newVoteType === 'none' ? null : newVoteType;

        // Update UI
        const upBtn = card.querySelector('.upvote');
        const downBtn = card.querySelector('.downvote');

        upBtn.classList.toggle('active', newVoteType === 'up');
        downBtn.classList.toggle('active', newVoteType === 'down');

        // Add animation
        if (newVoteType === 'up') {
            card.classList.add('vote-up');
            setTimeout(() => card.classList.remove('vote-up'), 200);
        } else if (newVoteType === 'down') {
            card.classList.add('vote-down');
            setTimeout(() => card.classList.remove('vote-down'), 200);
        }

        // Send vote to host
        if (store.get('isHost')) {
            host.vote(categoryIndex, answer, newVoteType);
        } else {
            client.vote(categoryIndex, answer, newVoteType);
        }
    }

    updateVoteCounts(votes) {
        if (!this.elements.votingContainer) return;

        this.elements.votingContainer.querySelectorAll('.vote-card').forEach(card => {
            const categoryIndex = parseInt(card.dataset.category);
            const answer = card.dataset.answer;

            const categoryVotes = votes[categoryIndex];
            const answerVotes = categoryVotes?.[answer];

            const upvotes = answerVotes?.upvotes?.length || 0;
            const downvotes = answerVotes?.downvotes?.length || 0;
            const netVotes = upvotes - downvotes;

            const countEl = card.querySelector('[data-count]');
            if (countEl) {
                countEl.textContent = netVotes >= 0 ? `+${netVotes}` : netVotes;
                countEl.classList.remove('positive', 'negative', 'neutral');
                if (netVotes > 0) {
                    countEl.classList.add('positive');
                } else if (netVotes < 0) {
                    countEl.classList.add('negative');
                } else {
                    countEl.classList.add('neutral');
                }
            }
        });
    }

    normalizeAnswer(answer) {
        return answer.toLowerCase().replace(/[^a-z0-9]/g, '');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    escapeAttr(text) {
        return text.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
}

export const votingScreen = new VotingScreen();
export default votingScreen;
