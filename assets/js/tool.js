const chatForm = document.querySelector("#chat-form");
const chatInput = document.querySelector("#chat-input");
const chatMessages = document.querySelector("#chat-messages");
const promptChips = document.querySelectorAll(".prompt-chip");

const cannedReplies = [
  {
    match: /what can this tool help users do/i,
    reply:
      "A first version could answer toolkit questions, guide users to the right page, explain workflows, and summarize what data they need before starting.",
  },
  {
    match: /idea connect|integration/i,
    reply:
      "IDEA suggests a direction where this site could grow from a static resource into a task-specific assistant. A practical path is UI first, API second, code-execution later if the project really needs it.",
  },
  {
    match: /data inputs/i,
    reply:
      "Likely inputs include site information, intervention type, partner context, project goals, and any hydrologic or ecological data needed to evaluate NbS outcomes.",
  },
  {
    match: /explain first|chatbot/i,
    reply:
      "The chatbot should probably start with simple guidance: what the toolkit is, who it is for, what inputs are needed, and what kind of outputs or recommendations it can provide.",
  },
];

function addBubble(role, text) {
  if (!chatMessages) return;
  const article = document.createElement("article");
  article.className = `chat-bubble ${role === "user" ? "chat-bubble-user" : "chat-bubble-assistant"}`;

  const speaker = document.createElement("p");
  speaker.className = "chat-speaker";
  speaker.textContent = role === "user" ? "You" : "Assistant";

  const body = document.createElement("p");
  body.textContent = text;

  article.append(speaker, body);
  chatMessages.append(article);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function generateReply(input) {
  const found = cannedReplies.find((item) => item.match.test(input));
  if (found) return found.reply;
  return "For now this is a frontend demo, but a real version could route this question to a project-specific assistant connected to toolkit documentation, workflows, or analysis tools.";
}

function handlePrompt(text) {
  addBubble("user", text);
  window.setTimeout(() => addBubble("assistant", generateReply(text)), 220);
}

if (chatForm && chatInput) {
  chatForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const text = chatInput.value.trim();
    if (!text) return;
    chatInput.value = "";
    handlePrompt(text);
  });
}

promptChips.forEach((chip) => {
  chip.addEventListener("click", () => handlePrompt(chip.textContent || ""));
});
