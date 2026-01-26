/**
 * Results Screen - Round scores, leaderboard
 */

import store from "../../state/store.js";
import host from "../../network/host.js";
import client from "../../network/client.js";

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
      resultsRound: document.getElementById("results-round"),
      roundScores: document.getElementById("round-scores"),
      leaderboardList: document.getElementById("leaderboard-list"),
      nextRoundBtn: document.getElementById("btn-next-round"),
      endGameBtn: document.getElementById("btn-end-game"),
    };
  }

  bindEvents() {
    // Next round button
    this.elements.nextRoundBtn?.addEventListener("click", () => {
      if (store.get("isHost")) {
        host.proceedFromResults();
      } else {
        client.readyForNextRound();
      }
    });

    // End game button (host only)
    this.elements.endGameBtn?.addEventListener("click", () => {
      if (store.get("isHost")) {
        host.endGameEarly();
      }
    });
  }

  subscribeToState() {
    // Render results when entering results phase
    store.subscribe("gamePhase", (phase) => {
      if (phase === "RESULTS") {
        this.renderResults();
        this.updateButtonVisibility();
      }
    });

    // Update button visibility based on host status
    store.subscribe("isHost", () => {
      this.updateButtonVisibility();
    });

    // Update button state for non-host
    store.subscribe("localPlayer.isReady", (isReady) => {
      const isHost = store.get("isHost");
      if (!isHost && this.elements.nextRoundBtn) {
        if (isReady) {
          this.elements.nextRoundBtn.textContent = "WAITING...";
          this.elements.nextRoundBtn.disabled = true;
        } else {
          this.elements.nextRoundBtn.textContent = "READY";
          this.elements.nextRoundBtn.disabled = false;
        }
      }
    });
  }

  updateButtonVisibility() {
    const isHost = store.get("isHost");

    if (this.elements.nextRoundBtn) {
      this.elements.nextRoundBtn.textContent = isHost ? "ANOTHER ROUND" : "READY";
      this.elements.nextRoundBtn.disabled = false;
    }

    if (this.elements.endGameBtn) {
      // Only host can end the game
      this.elements.endGameBtn.style.display = isHost ? "inline-block" : "none";
    }
  }

  renderResults() {
    const roundResults = store.get("roundResults");
    const currentRound = store.get("currentRound");
    const categories = store.get("categories");
    const players = store.get("players");
    const scores = store.get("scores");

    // Update round number
    if (this.elements.resultsRound) {
      this.elements.resultsRound.textContent = currentRound;
    }

    // Build player lookup
    const playerNames = {};
    players.forEach((p) => {
      playerNames[p.id] = p.name;
    });

    // Render round scores
    this.renderRoundScores(roundResults, categories, playerNames);

    // Render leaderboard
    this.renderLeaderboard(players, scores);
  }

  renderRoundScores(results, categories, playerNames) {
    if (!this.elements.roundScores || !results) {
      return;
    }

    let html = '<div class="scores-by-category stagger-children">';

    results.categoryResults.forEach((catResult, index) => {
      html += `
                <div class="category-results">
                    <h4>${index + 1}. ${this.escapeHtml(categories[index])}</h4>
                    <div class="answers-list">
            `;

      catResult.answers.forEach((answer) => {
        const isValid = answer.netVotes > 0;
        const pointsText = isValid ? `+${answer.points}` : "0";

        html += `
                    <div class="score-entry ${isValid ? "valid" : "invalid"}">
                        <span class="entry-answer">${this.escapeHtml(answer.answer)}</span>
                        <span class="entry-votes">[${answer.netVotes >= 0 ? "+" : ""}${answer.netVotes}]</span>
                        <span class="entry-points">${pointsText}</span>
                    </div>
                `;
      });

      html += "</div></div>";
    });

    html += "</div>";

    // Add round summary
    html += '<div class="round-summary">';
    html += "<h4>ROUND SCORES</h4>";

    const sortedPlayers = Object.entries(results.playerScores)
      .sort((a, b) => b[1] - a[1])
      .map(([playerId, score]) => ({
        name: playerNames[playerId] || "Unknown",
        score,
      }));

    sortedPlayers.forEach(({ name, score }) => {
      html += `<div class="round-player-score"><span>${this.escapeHtml(name)}</span><span>+${score}</span></div>`;
    });

    html += "</div>";

    this.elements.roundScores.innerHTML = html;
  }

  renderLeaderboard(players, scores) {
    if (!this.elements.leaderboardList) {
      return;
    }

    const cumulativeScores = store.get("cumulativeScores") || {};

    // Sort players by game score
    const sortedPlayers = [...players].sort((a, b) => {
      const scoreA = scores[a.id] || 0;
      const scoreB = scores[b.id] || 0;
      return scoreB - scoreA;
    });

    let html = '<div class="leaderboard-section"><h4>THIS GAME</h4>';
    html += sortedPlayers
      .map((player, index) => {
        const score = scores[player.id] || 0;
        const position = index + 1;
        let positionClass = "";
        if (position === 1) {
          positionClass = "first";
        } else if (position === 2) {
          positionClass = "second";
        } else if (position === 3) {
          positionClass = "third";
        }

        return `
                <li class="${positionClass}">
                    <span class="player-name">${this.escapeHtml(player.name)}</span>
                    <span class="player-score">${score} pts</span>
                </li>
            `;
      })
      .join("");
    html += "</div>";

    // Show cumulative scores if any exist
    if (Object.keys(cumulativeScores).length > 0) {
      // Sort by cumulative score
      const sortedCumulative = Object.entries(cumulativeScores)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5); // Show top 5

      html += '<div class="leaderboard-section cumulative"><h4>ALL-TIME</h4>';
      sortedCumulative.forEach(([name, score], index) => {
        const position = index + 1;
        let positionClass = "";
        if (position === 1) {
          positionClass = "first";
        } else if (position === 2) {
          positionClass = "second";
        } else if (position === 3) {
          positionClass = "third";
        }

        html += `
                <li class="${positionClass}">
                    <span class="player-name">${this.escapeHtml(name)}</span>
                    <span class="player-score">${score} pts</span>
                </li>
            `;
      });
      html += "</div>";
    }

    this.elements.leaderboardList.innerHTML = html;
  }

  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
}

export const resultsScreen = new ResultsScreen();
export default resultsScreen;
