/**
 * Answer Screen - Category grid, inputs, timer
 */

import store from "../../state/store.js";
import host from "../../network/host.js";
import client from "../../network/client.js";

class AnswerScreen {
  constructor() {
    this.elements = {};
    this.answers = {};
  }

  /**
   * Initialize answer screen
   */
  init() {
    this.cacheElements();
    this.bindEvents();
    this.subscribeToState();
  }

  cacheElements() {
    this.elements = {
      currentRound: document.getElementById("current-round"),
      totalRounds: document.getElementById("total-rounds"),
      currentLetter: document.getElementById("current-letter"),
      timerValue: document.getElementById("timer-value"),
      timerDisplay: document.getElementById("timer-display"),
      answerGrid: document.getElementById("answer-grid"),
      submitBtn: document.getElementById("btn-submit-answers"),
    };
  }

  bindEvents() {
    // Submit answers
    this.elements.submitBtn?.addEventListener("click", () => {
      this.submitAnswers();
    });

    // Use event delegation for answer grid inputs (avoids memory leaks from re-rendering)
    this.elements.answerGrid?.addEventListener("input", (e) => {
      if (e.target.matches("input[data-category-index]")) {
        const index = parseInt(e.target.dataset.categoryIndex);
        this.answers[index] = e.target.value.trim();
      }
    });

    this.elements.answerGrid?.addEventListener("keypress", (e) => {
      if (e.target.matches("input[data-category-index]") && e.key === "Enter") {
        const inputs = this.elements.answerGrid.querySelectorAll("input");
        const currentIndex = Array.from(inputs).indexOf(e.target);
        if (currentIndex === inputs.length - 1) {
          this.submitAnswers();
        } else {
          inputs[currentIndex + 1].focus();
        }
      }
    });
  }

  subscribeToState() {
    // Update round display
    store.subscribe("currentRound", (round) => {
      if (this.elements.currentRound) {
        this.elements.currentRound.textContent = round;
      }
    });

    store.subscribe("totalRounds", (total) => {
      if (this.elements.totalRounds) {
        this.elements.totalRounds.textContent = total;
      }
    });

    // Update letter display
    store.subscribe("currentLetter", (letter) => {
      if (this.elements.currentLetter) {
        this.elements.currentLetter.textContent = letter;
        this.elements.currentLetter.classList.add("letter-reveal");
        setTimeout(() => {
          this.elements.currentLetter.classList.remove("letter-reveal");
        }, 800);
      }
    });

    // Update timer
    store.subscribe("timerRemaining", (remaining) => {
      this.updateTimer(remaining);
    });

    // Render categories when they change
    store.subscribe("categories", (categories) => {
      this.renderAnswerGrid(categories);
    });

    // Reset answers when entering answering phase
    store.subscribe("gamePhase", (phase) => {
      if (phase === "ANSWERING") {
        this.answers = {};
        this.renderAnswerGrid(store.get("categories"));
      }
    });

    // Update submit button state
    store.subscribe("localPlayer.isReady", (isReady) => {
      if (this.elements.submitBtn) {
        if (isReady) {
          this.elements.submitBtn.textContent = "SUBMITTED";
          this.elements.submitBtn.disabled = true;
        } else {
          this.elements.submitBtn.textContent = "DONE";
          this.elements.submitBtn.disabled = false;
        }
      }
    });
  }

  updateTimer(seconds) {
    if (!this.elements.timerValue || !this.elements.timerDisplay) {
      return;
    }

    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    this.elements.timerValue.textContent = `${minutes}:${secs.toString().padStart(2, "0")}`;

    // Add warning classes
    this.elements.timerDisplay.classList.remove("warning", "critical");
    if (seconds <= 10) {
      this.elements.timerDisplay.classList.add("critical", "timer-urgent");
    } else if (seconds <= 30) {
      this.elements.timerDisplay.classList.add("warning");
    }
  }

  renderAnswerGrid(categories) {
    if (!this.elements.answerGrid || !categories) {
      return;
    }

    const letter = store.get("currentLetter");

    this.elements.answerGrid.innerHTML = categories
      .map(
        (category, index) => `
            <div class="answer-item">
                <label for="answer-${index}">${index + 1}. ${this.escapeHtml(category)}</label>
                <input
                    type="text"
                    id="answer-${index}"
                    class="retro-input"
                    placeholder="${letter}..."
                    data-category-index="${index}"
                    autocomplete="off"
                >
            </div>
        `
      )
      .join("");

    // Focus first input
    const firstInput = this.elements.answerGrid.querySelector("input");
    if (firstInput) {
      setTimeout(() => firstInput.focus(), 100);
    }
  }

  submitAnswers() {
    // Collect all answers from inputs
    this.elements.answerGrid?.querySelectorAll("input").forEach((input) => {
      const index = parseInt(input.dataset.categoryIndex);
      this.answers[index] = input.value.trim();
    });

    if (store.get("isHost")) {
      host.submitAnswers(this.answers);
    } else {
      client.submitAnswers(this.answers);
    }
  }

  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
}

export const answerScreen = new AnswerScreen();
export default answerScreen;
