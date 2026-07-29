const WORDLE_MAX_ATTEMPTS = 6;

const gameState = {
  selectedWord: "",
  attempts: [],
  currentAttempt: "",
  solved: false,
  gameOver: false,
  currentEntryIndex: 0,
  wordData: null,
};

function getWordEntries() {
  return fetch("../games/words/organic_chemistry.json")
    .then((response) => {
      if (!response.ok) {
        throw new Error("Unable to load challenge words.");
      }
      return response.json();
    })
    .then((entries) => entries.filter((entry) => entry.word && entry.word.length > 0));
}

function getRandomWord(entries) {
  const index = Math.floor(Math.random() * entries.length);
  return entries[index];
}

function getLetterFeedback(guess, target) {
  const result = Array(guess.length).fill("gray");
  const targetLetters = target.split("");
  const guessLetters = guess.split("");
  const remainingLetters = [];

  guessLetters.forEach((letter, index) => {
    if (letter === targetLetters[index]) {
      result[index] = "green";
    } else {
      remainingLetters.push({ letter, index });
    }
  });

  remainingLetters.forEach(({ letter, index }) => {
    const targetIndex = targetLetters.findIndex((targetLetter, searchIndex) => {
      if (result[searchIndex] === "green") {
        return false;
      }
      return targetLetter === letter;
    });

    if (targetIndex >= 0) {
      result[index] = "orange";
      targetLetters[targetIndex] = "";
    }
  });

  return result;
}

function getBoardLength() {
  return gameState.selectedWord.length || 5;
}

function renderBoard() {
  const board = document.getElementById("wordleBoard");
  if (!board) {
    return;
  }

  board.style.setProperty("--word-length", String(getBoardLength()));
  board.innerHTML = "";

  for (let rowIndex = 0; rowIndex < WORDLE_MAX_ATTEMPTS; rowIndex += 1) {
    const row = document.createElement("div");
    row.className = "wordle-row";

    for (let colIndex = 0; colIndex < getBoardLength(); colIndex += 1) {
      const tile = document.createElement("div");
      tile.className = "wordle-tile";

      const attempt = gameState.attempts[rowIndex];
      if (attempt) {
        tile.textContent = attempt.guess[colIndex] || "";
        tile.classList.add(attempt.feedback?.[colIndex] || "filled");
      } else if (rowIndex === gameState.currentEntryIndex) {
        const activeLetter = gameState.currentAttempt[colIndex] || "";
        tile.textContent = activeLetter;
      }

      row.appendChild(tile);
    }

    board.appendChild(row);
  }
}

function updateStatusMessage(message, tone = "info") {
  const status = document.getElementById("gameStatus");
  if (!status) {
    return;
  }

  status.textContent = message;
  status.className = `game-status ${tone}`;
}

function setFeedbackPanel() {
  const panel = document.getElementById("challengeDetails");
  if (!panel || !gameState.wordData) {
    return;
  }

  if (!gameState.gameOver) {
    panel.innerHTML = "";
    return;
  }

  panel.innerHTML = `
    <div class="detail-card">
      <p class="detail-label">Word</p>
      <p class="detail-value">${gameState.wordData.word}</p>
    </div>
    <div class="detail-card">
      <p class="detail-label">Definition</p>
      <p class="detail-value">${gameState.wordData.definition}</p>
    </div>
    <div class="detail-card">
      <p class="detail-label">Why It Matters</p>
      <p class="detail-value">${gameState.wordData.importance}</p>
    </div>
    <div class="detail-card">
      <p class="detail-label">Related Topics</p>
      <p class="detail-value">${gameState.wordData.relatedTopics.join(", ")}</p>
    </div>
  `;
}

function resetGame() {
  gameState.attempts = [];
  gameState.currentAttempt = "";
  gameState.solved = false;
  gameState.gameOver = false;
  gameState.currentEntryIndex = 0;
  renderBoard();
  updateStatusMessage("Guess the organic chemistry term in six tries.");
  setFeedbackPanel();
}

function startGame(wordData) {
  gameState.wordData = wordData;
  gameState.selectedWord = wordData.word.toUpperCase();
  resetGame();
  document.getElementById("newWordButton")?.focus();
}

function handleGuessSubmission() {
  if (gameState.gameOver) {
    return;
  }

  if (gameState.currentAttempt.length < getBoardLength()) {
    updateStatusMessage(`Enter a full ${getBoardLength()}-letter term.`, "warning");
    return;
  }

  const guess = gameState.currentAttempt.toUpperCase();
  const feedback = getLetterFeedback(guess, gameState.selectedWord);

  gameState.attempts[gameState.currentEntryIndex] = {
    guess,
    feedback,
  };

  gameState.currentEntryIndex += 1;
  gameState.currentAttempt = "";
  renderBoard();

  if (guess === gameState.selectedWord) {
    gameState.solved = true;
    gameState.gameOver = true;
    updateStatusMessage("✅ Correct! You solved the challenge.", "success");
    setFeedbackPanel();
    return;
  }

  if (gameState.currentEntryIndex >= WORDLE_MAX_ATTEMPTS) {
    gameState.gameOver = true;
    updateStatusMessage(`No more tries. The word was ${gameState.selectedWord}.`, "error");
    setFeedbackPanel();
    return;
  }

  updateStatusMessage("Try another guess.", "info");
}

function handleKeyboardInput(key) {
  if (gameState.gameOver) {
    return;
  }

  if (key === "Backspace") {
    gameState.currentAttempt = gameState.currentAttempt.slice(0, -1);
    renderBoard();
    return;
  }

  if (key === "Enter") {
    handleGuessSubmission();
    return;
  }

  if (/^[A-Za-z]$/.test(key)) {
    if (gameState.currentAttempt.length >= getBoardLength()) {
      return;
    }
    gameState.currentAttempt += key.toUpperCase();
    renderBoard();
  }
}

function setupGame() {
  const keyboard = document.getElementById("keyboard");
  if (keyboard) {
    keyboard.querySelectorAll("button").forEach((button) => {
      button.addEventListener("click", () => {
        const value = button.dataset.key || button.textContent.trim();
        handleKeyboardInput(value);
      });
    });
  }

  document.addEventListener("keydown", (event) => {
    const key = event.key;
    if (key === "Backspace" || key === "Enter" || /^[A-Za-z]$/.test(key)) {
      event.preventDefault();
      handleKeyboardInput(key);
    }
  });

  const newWordButton = document.getElementById("newWordButton");
  if (newWordButton) {
    newWordButton.addEventListener("click", () => {
      getWordEntries().then((entries) => {
        const nextWord = getRandomWord(entries);
        startGame(nextWord);
      });
    });
  }

  getWordEntries().then((entries) => {
    const starterWord = getRandomWord(entries);
    startGame(starterWord);
  }).catch((error) => {
    updateStatusMessage(error.message, "error");
  });
}

window.addEventListener("DOMContentLoaded", () => {
  setupGame();
});
