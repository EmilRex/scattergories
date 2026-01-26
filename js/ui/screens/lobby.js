/**
 * Lobby Screen - Player list, settings, ready system
 */

import store from "../../state/store.js";
import host from "../../network/host.js";
import client from "../../network/client.js";
import { copyGameUrlToClipboard } from "../../utils/url.js";
import { showToast } from "../components/toast.js";

class LobbyScreen {
  constructor() {
    this.elements = {};
  }

  /**
   * Initialize lobby screen
   */
  init() {
    this.cacheElements();
    this.bindEvents();
    this.subscribeToState();
  }

  cacheElements() {
    this.elements = {
      gameCode: document.getElementById("lobby-game-code"),
      copyCodeBtn: document.getElementById("btn-copy-code"),
      copyLinkBtn: document.getElementById("btn-copy-link"),
      playerList: document.getElementById("player-list"),
      hostSettings: document.getElementById("host-settings"),
      categoriesSetting: document.getElementById("setting-categories"),
      timerSetting: document.getElementById("setting-timer"),
      votingTimerSetting: document.getElementById("setting-voting-timer"),
      readyBtn: document.getElementById("btn-ready"),
      readyStatus: document.getElementById("ready-status"),
    };
  }

  bindEvents() {
    // Copy game code only
    this.elements.copyCodeBtn?.addEventListener("click", async () => {
      const gameId = store.get("gameId");
      try {
        await navigator.clipboard.writeText(gameId);
        showToast("Code copied!", "success");
      } catch {
        showToast("Failed to copy", "error");
      }
    });

    // Copy game link
    this.elements.copyLinkBtn?.addEventListener("click", async () => {
      const gameId = store.get("gameId");
      const success = await copyGameUrlToClipboard(gameId);
      showToast(success ? "Link copied!" : "Failed to copy", success ? "success" : "error");
    });

    // Ready button
    this.elements.readyBtn?.addEventListener("click", () => {
      if (store.get("isHost")) {
        host.toggleReady();
      } else {
        client.toggleReady();
      }
    });

    // Settings controls (host only)
    document.querySelectorAll("[data-setting]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (!store.get("isHost")) {
          return;
        }

        const setting = btn.dataset.setting;
        const delta = parseInt(btn.dataset.delta);

        let settingKey;
        switch (setting) {
          case "timer":
            settingKey = "timerSeconds";
            break;
          case "categories":
            settingKey = "categoriesPerRound";
            break;
          case "votingTimer":
            settingKey = "votingTimerSeconds";
            break;
          default:
            settingKey = "rounds";
        }

        const currentValue = store.get(`settings.${settingKey}`);
        host.updateSettings(settingKey, currentValue + delta);
      });
    });
  }

  subscribeToState() {
    // Update game code display
    store.subscribe("gameId", (gameId) => {
      if (this.elements.gameCode) {
        this.elements.gameCode.textContent = gameId || "";
      }
    });

    // Update player list
    store.subscribe("players", (players) => {
      this.renderPlayerList(players);
      this.updateReadyStatus(players);
    });

    // Update settings display
    store.subscribe("settings", (settings) => {
      if (this.elements.categoriesSetting) {
        this.elements.categoriesSetting.textContent = settings.categoriesPerRound;
      }
      if (this.elements.timerSetting) {
        this.elements.timerSetting.textContent = settings.timerSeconds;
      }
      if (this.elements.votingTimerSetting) {
        this.elements.votingTimerSetting.textContent = settings.votingTimerSeconds;
      }
    });

    // Show/hide host settings
    store.subscribe("isHost", (isHost) => {
      if (this.elements.hostSettings) {
        // Only host can modify settings
        const buttons = this.elements.hostSettings.querySelectorAll("button");
        buttons.forEach((btn) => {
          btn.disabled = !isHost;
        });
      }
    });

    // Update ready button state
    store.subscribe("localPlayer", (localPlayer) => {
      if (this.elements.readyBtn) {
        if (localPlayer.isReady) {
          this.elements.readyBtn.textContent = "NOT READY";
          this.elements.readyBtn.classList.remove("primary");
          this.elements.readyBtn.classList.add("secondary");
        } else {
          this.elements.readyBtn.textContent = "READY";
          this.elements.readyBtn.classList.add("primary");
          this.elements.readyBtn.classList.remove("secondary");
        }
      }
    });
  }

  renderPlayerList(players) {
    if (!this.elements.playerList) {
      return;
    }

    this.elements.playerList.innerHTML = players
      .map(
        (player) => `
            <li class="${player.isReady ? "ready" : ""} ${player.isHost ? "host" : ""}" data-player-id="${player.id}">
                <span class="player-name ${player.isConnected === false ? "disconnected" : ""}">${this.escapeHtml(player.name)}</span>
            </li>
        `
      )
      .join("");
  }

  updateReadyStatus(players) {
    if (!this.elements.readyStatus) {
      return;
    }

    const readyCount = players.filter((p) => p.isReady).length;
    const totalCount = players.length;

    if (totalCount < 2) {
      this.elements.readyStatus.textContent = "WAITING FOR PLAYERS...";
    } else {
      this.elements.readyStatus.textContent = `${readyCount}/${totalCount} READY`;
    }
  }

  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
}

export const lobbyScreen = new LobbyScreen();
export default lobbyScreen;
