const chatBox = document.getElementById("chat-box");
const askForm = document.getElementById("ask-form");
const promptInput = document.getElementById("user-prompt");
const historyList = document.getElementById("history-list");
const clearBtn = document.getElementById("clear-history");
const quickButtons = document.querySelectorAll(".quick-btn");
const themeBtn = document.getElementById("toggle-theme");
const randomBtn = document.getElementById("random-btn");

let history = JSON.parse(localStorage.getItem("chatHistory")) || [];
updateHistory();

const keyAudio = new Audio('/static/sfx/keystroke.wav');
keyAudio.volume = 0.1;

// Handle form submit
askForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const prompt = promptInput.value.trim();
  if (!prompt) return;
  addToHistory(prompt);
  await handleUserPrompt(prompt);
});

// Quick buttons
quickButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    const preset = btn.getAttribute("data-prompt");
    promptInput.value = preset;
    promptInput.focus();
  });
});

// Random button
randomBtn?.addEventListener("click", () => {
  const prompts = [
    "What is a CT scan?",
    "How does ultrasound imaging work?",
    "What is a pacemaker?",
    "Tell me a fun medical fact",
    "What are the risks of an MRI?"
  ];
  const random = prompts[Math.floor(Math.random() * prompts.length)];
  promptInput.value = random;
  promptInput.focus();
});

// Theme toggle
themeBtn?.addEventListener("click", () => {
  document.body.classList.toggle("light-mode");
});

// Handle prompt and response
async function handleUserPrompt(prompt) {
  const userBubble = document.createElement("div");
  userBubble.className = "user-bubble typing";
  chatBox.appendChild(userBubble);
  await typeText(userBubble, prompt, 10);
  userBubble.classList.remove("typing");

  const aiBubble = document.createElement("div");
  aiBubble.className = "ai-bubble loading typing";
  aiBubble.textContent = "⌛ Thinking...";
  chatBox.appendChild(aiBubble);
  chatBox.scrollTop = chatBox.scrollHeight;

  try {
    const res = await fetch("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt })
    });
    const data = await res.json();
    aiBubble.classList.remove("loading");
    await typeText(aiBubble, data.response || data.error || "No response.", getSpeedByCategory(prompt));
  } catch (err) {
    aiBubble.textContent = "⚠️ Something went wrong.";
  }

  aiBubble.classList.remove("typing");
  promptInput.value = "";
  chatBox.scrollTop = chatBox.scrollHeight;

  const convoText = Array.from(chatBox.querySelectorAll('.ai-bubble, .user-bubble'))
    .map(el => el.textContent).join("\n\n");
  saveConversation(convoText);
}

// Typing animation
function typeText(element, text, speed = 20) {
  return new Promise(resolve => {
    element.textContent = "";
    let index = 0;
    function typeChar() {
      if (index < text.length) {
        element.textContent += text.charAt(index);
        if (index % 3 === 0) {
          keyAudio.currentTime = 0;
          keyAudio.play().catch(() => {});
        }
        index++;
        setTimeout(typeChar, speed);
      } else {
        keyAudio.pause();
        keyAudio.currentTime = 0;
        resolve();
      }
    }
    typeChar();
  });
}

function getSpeedByCategory(prompt) {
  const lower = prompt.toLowerCase();
  if (lower.includes("fun fact")) return 40;
  if (lower.includes("scan") || lower.includes("test")) return 15;
  return 25;
}

function submitPrompt(text) {
  promptInput.value = text;
  askForm.requestSubmit();
}

// Save button behavior
function saveCurrentConversation() {
  const convoText = Array.from(chatBox.querySelectorAll('.ai-bubble, .user-bubble'))
    .map(el => el.textContent).join("\n\n");

  if (!convoText.trim()) return;

  let saved = JSON.parse(localStorage.getItem("chatConvos") || "[]");
  saved.unshift(convoText);
  localStorage.setItem("chatConvos", JSON.stringify(saved));
  createHistoryPopup(convoText, 0);
}

// Update short history list
function addToHistory(prompt) {
  history.unshift(prompt);
  localStorage.setItem("chatHistory", JSON.stringify(history));
  updateHistory();
}

function updateHistory() {
  if (!historyList) return;
  historyList.innerHTML = "";
  history.forEach((item) => {
    const entry = document.createElement("div");
    entry.className = "history-entry";
    entry.innerHTML = `
      <div class="entry-header">
        <span class="entry-dot red"></span>
        <span class="entry-dot yellow"></span>
        <span class="entry-dot green"></span>
      </div>
      <div class="entry-body" title="${item}">
        <span class="entry-text">${item.length > 40 ? item.slice(0, 40) + "..." : item}</span>
      </div>
    `;
    entry.addEventListener("click", () => {
      promptInput.value = item;
      promptInput.focus();
    });
    historyList.appendChild(entry);
  });
}

clearBtn?.addEventListener("click", () => {
  localStorage.removeItem("chatHistory");
  history = [];
  updateHistory();
});

// Full chat saving
function saveConversation(convo) {
  const saved = JSON.parse(localStorage.getItem("chatConvos") || "[]");
  saved.unshift(convo);
  localStorage.setItem("chatConvos", JSON.stringify(saved));
}

function restoreConversations() {
  const saved = JSON.parse(localStorage.getItem("chatConvos") || "[]");
  saved.forEach((convo, index) => createHistoryPopup(convo, index));
}

function createHistoryPopup(text, index) {
  const popup = document.createElement("div");
  popup.className = "history-window";
  popup.style.top = `${80 + index * 60}px`;
  popup.style.left = `60px`;

  popup.innerHTML = `
    <div class="header" onmousedown="startPopupDrag(event, this.parentElement)">
      <span>Chat ${index + 1}</span>
      <button class="close-btn" onclick="deleteConversation(${index}, this.parentElement)">✕</button>
    </div>
    <div class="body collapsed"
         onclick="togglePopupBody(this)"
         data-full-text="${text}"
         data-preview-text="${text.split('\n')[0].slice(0, 40)}...">${text.split('\n')[0].slice(0, 40)}...</div>
  `;

  document.body.appendChild(popup);
}

function deleteConversation(index, popupEl) {
  let saved = JSON.parse(localStorage.getItem("chatConvos") || "[]");
  saved.splice(index, 1);
  localStorage.setItem("chatConvos", JSON.stringify(saved));
  popupEl.remove();
}

function togglePopupBody(bodyDiv) {
  bodyDiv.classList.toggle("collapsed");
  bodyDiv.classList.toggle("expanded");
  if (bodyDiv.classList.contains("expanded")) {
    bodyDiv.textContent = bodyDiv.dataset.fullText;
  } else {
    bodyDiv.textContent = bodyDiv.dataset.previewText;
  }
}

function startPopupDrag(e, popup) {
  let shiftX = e.clientX - popup.getBoundingClientRect().left;
  let shiftY = e.clientY - popup.getBoundingClientRect().top;

  function moveAt(pageX, pageY) {
    popup.style.left = pageX - shiftX + "px";
    popup.style.top = pageY - shiftY + "px";
  }

  function onMouseMove(e) {
    moveAt(e.pageX, e.pageY);
  }

  document.addEventListener('mousemove', onMouseMove);
  document.onmouseup = () => {
    document.removeEventListener('mousemove', onMouseMove);
    document.onmouseup = null;
  };
}

window.addEventListener("DOMContentLoaded", () => {
  restoreConversations();
});
