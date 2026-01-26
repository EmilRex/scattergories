/**
 * Final Screen - Game over, final standings, play again
 */

import store from "../../state/store.js";
import host from "../../network/host.js";
import gameState, { PHASES } from "../../state/game-state.js";
import { removeGameIdFromUrl } from "../../utils/url.js";
import peerManager from "../../network/peer-manager.js";
import storage from "../../utils/storage.js";

class FinalScreen {
  constructor() {
    this.elements = {};
  }

  /**
   * Initialize final screen
   */
  init() {
    this.cacheElements();
    this.bindEvents();
    this.subscribeToState();
  }

  cacheElements() {
    this.elements = {
      winnerDisplay: document.getElementById("winner-display"),
      finalStandingsList: document.getElementById("final-standings-list"),
      playAgainBtn: document.getElementById("btn-play-again"),
      backHomeBtn: document.getElementById("btn-back-home"),
    };
  }

  bindEvents() {
    // Play again (host only can initiate)
    this.elements.playAgainBtn?.addEventListener("click", () => {
      if (store.get("isHost")) {
        host.playAgain();
      }
    });

    // Back to home
    this.elements.backHomeBtn?.addEventListener("click", () => {
      this.goHome();
    });
  }

  subscribeToState() {
    // Render final standings when entering game over phase
    store.subscribe("gamePhase", (phase) => {
      if (phase === "GAME_OVER") {
        this.renderFinalResults();
      }
    });

    // Show/hide play again button based on host status
    store.subscribe("isHost", (isHost) => {
      if (this.elements.playAgainBtn) {
        this.elements.playAgainBtn.style.display = isHost ? "block" : "none";
      }
    });
  }

  renderFinalResults() {
    const players = store.get("players");
    const scores = store.get("scores");
    const cumulativeScores = store.get("cumulativeScores") || storage.getCumulativeScores();

    // Sort players by game score for winner display
    const sortedPlayers = [...players].sort((a, b) => {
      const scoreA = scores[a.id] || 0;
      const scoreB = scores[b.id] || 0;
      return scoreB - scoreA;
    });

    // Render winner (of this game)
    if (this.elements.winnerDisplay && sortedPlayers.length > 0) {
      const winner = sortedPlayers[0];
      const winnerScore = scores[winner.id] || 0;

      // Check for tie
      const tiedWinners = sortedPlayers.filter((p) => (scores[p.id] || 0) === winnerScore);

      if (tiedWinners.length > 1) {
        this.elements.winnerDisplay.innerHTML = `
                    <h3 class="celebration">IT'S A TIE!</h3>
                    <p class="winner-names">${tiedWinners.map((p) => this.escapeHtml(p.name)).join(" & ")}</p>
                    <p class="winner-score">${winnerScore} POINTS THIS GAME</p>
                `;
      } else {
        this.elements.winnerDisplay.innerHTML = `
                    <h3 class="celebration">WINNER!</h3>
                    <p class="winner-name">${this.escapeHtml(winner.name)}</p>
                    <p class="winner-score">${winnerScore} POINTS THIS GAME</p>
                `;
      }
    }

    // Render standings - show both this game and cumulative
    if (this.elements.finalStandingsList) {
      let html = '<div class="standings-section"><h4>THIS GAME</h4>';

      html += sortedPlayers
        .map((player, index) => {
          const score = scores[player.id] || 0;
          const position = index + 1;

          let medal = "";
          if (position === 1) {
            medal = "1ST";
          } else if (position === 2) {
            medal = "2ND";
          } else if (position === 3) {
            medal = "3RD";
          } else {
            medal = `${position}TH`;
          }

          return `
                    <li>
                        <span class="position">${medal}</span>
                        <span class="player-name">${this.escapeHtml(player.name)}</span>
                        <span class="player-score">${score} pts</span>
                    </li>
                `;
        })
        .join("");

      html += "</div>";

      // Show cumulative scores if any exist
      if (Object.keys(cumulativeScores).length > 0) {
        const sortedCumulative = Object.entries(cumulativeScores)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5);

        html += '<div class="standings-section cumulative"><h4>ALL-TIME</h4>';

        sortedCumulative.forEach(([name, score], index) => {
          const position = index + 1;
          let medal = "";
          if (position === 1) {
            medal = "1ST";
          } else if (position === 2) {
            medal = "2ND";
          } else if (position === 3) {
            medal = "3RD";
          } else {
            medal = `${position}TH`;
          }

          html += `
                    <li>
                        <span class="position">${medal}</span>
                        <span class="player-name">${this.escapeHtml(name)}</span>
                        <span class="player-score">${score} pts</span>
                    </li>
                `;
        });

        html += "</div>";
      }

      this.elements.finalStandingsList.innerHTML = html;
    }

    // Update play again button visibility
    if (this.elements.playAgainBtn) {
      this.elements.playAgainBtn.style.display = store.get("isHost") ? "block" : "none";
    }
  }

  goHome() {
    // Clean up connection
    peerManager.destroy();

    // Reset state
    store.reset();

    // Remove game ID from URL
    removeGameIdFromUrl();

    // Go to home screen
    gameState.forcePhase(PHASES.HOME);
  }

  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
}

export const finalScreen = new FinalScreen();
export default finalScreen;
