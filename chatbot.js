// ==========================================
// MOEIN'S AI ASSISTANT - HYBRID CHATBOT
// ==========================================
// Tries Gemini AI (via Cloudflare Worker) first.
// Falls back to rule-based if AI is unavailable.
// API key is SECRET - hidden inside Cloudflare Worker.
// ==========================================

const CONFIG = {
  // Cloudflare Worker URL — keeps API key SECRET on the server side
  WORKER_URL: "https://moein-ai-proxy.moein-tash.workers.dev"
};

window.CV_DATA = null;

// Fallback data (in case data.json fails to load)
const FALLBACK_DATA = {
  chatbotKnowledge: [
    {
      keywords: ["research", "area", "focus", "what", "work"],
      answer: "Moein Tash's research area is Natural Language Processing (NLP). His work focuses on deep learning, transformers, sentiment analysis, hate/hope speech detection, and social support detection."
    },
    {
      keywords: ["who", "name", "are you", "moein"],
      answer: "Moein Tash is a PhD researcher in Artificial Intelligence (NLP) at IPN Mexico City and currently a Lecturer at Universidad Panamericana, CDMX."
    }
  ],
  greetings: ["Hello! I'm Moein's AI assistant. Feel free to ask me anything about Moein Tash."],
  offTopicResponse: "I can only answer questions related to Moein Tash."
};

async function loadData() {
  try {
    const res = await fetch('data.json?t=' + Date.now());
    if (!res.ok) throw new Error('fetch failed');
    window.CV_DATA = await res.json();
  } catch (e) {
    console.warn('data.json failed, using fallback:', e);
    window.CV_DATA = FALLBACK_DATA;
  }
  showInitialGreeting();
}

function showInitialGreeting() {
  const messages = document.getElementById('chatMessages');
  if (!messages || messages.children.length > 0) return;
  
  const greeting = (window.CV_DATA?.greetings?.[0])
    || "Hello! I'm Moein's AI assistant. Feel free to ask me anything about Moein Tash.";
  
  const msg = document.createElement('div');
  msg.className = 'message bot';
  msg.innerHTML = `
    <div class="msg-avatar">🤖</div>
    <div class="msg-bubble-wrap">
      <div class="msg-content">${escapeHtml(greeting)}</div>
      <div class="msg-time">${getTimeNow()}</div>
    </div>
  `;
  messages.appendChild(msg);
}

// ==========================================
// BUILD CONTEXT FROM data.json (for AI)
// ==========================================
function buildContextForAI() {
  const data = window.CV_DATA;
  if (!data) return "";
  
  let context = "";
  
  // Personal info
  if (data.personal) {
    context += `Name: ${data.personal.fullName || data.personal.name}\n`;
    context += `Title: ${data.personal.title}\n`;
    if (data.personal.tagline) context += `About: ${data.personal.tagline}\n`;
    if (data.personal.email) context += `Email: ${data.personal.email}\n`;
  }
  
  // Knowledge base — convert Q&A to facts
  if (data.chatbotKnowledge && data.chatbotKnowledge.length > 0) {
    context += "\nKEY FACTS:\n";
    data.chatbotKnowledge.forEach(item => {
      context += `- ${item.answer}\n`;
    });
  }
  
  return context;
}

// ==========================================
// AI ANSWER (via Cloudflare Worker)
// ==========================================
async function aiAnswer(question) {
  if (!CONFIG.WORKER_URL) return null;
  
  try {
    const response = await fetch(CONFIG.WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: question,
        context: buildContextForAI()
      })
    });
    
    if (!response.ok) {
      console.warn('Worker returned error:', response.status);
      return null;
    }
    
    const data = await response.json();
    if (data.error || data.fallback) {
      console.warn('AI fallback triggered:', data.error);
      return null;
    }
    return data.answer || null;
  } catch (e) {
    console.warn('AI request failed:', e);
    return null;
  }
}

// ==========================================
// RULE-BASED ANSWER (fallback)
// ==========================================
function ruleBasedAnswer(question) {
  const data = window.CV_DATA;
  if (!data) return "Loading... please try again in a moment.";
  
  const q = question.toLowerCase().trim();
  
  if (/^(hi|hello|hey|hola|salam)\b/.test(q)) {
    return "Hello! 👋 I'm Moein's AI assistant. Ask me anything about his research, education, publications, or background!";
  }
  
  if (/(thank|thanks|gracias|merci)/.test(q)) {
    return "You're welcome! Feel free to ask anything else about Moein.";
  }
  
  let bestMatch = null;
  let bestScore = 0;
  
  for (const entry of data.chatbotKnowledge) {
    let score = 0;
    for (const keyword of entry.keywords) {
      if (q.includes(keyword.toLowerCase())) {
        score += keyword.length;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = entry;
    }
  }
  
  if (bestMatch && bestScore >= 3) {
    return bestMatch.answer;
  }
  
  if (/(moein|tash|shahiki|\bhe\b|\bhim\b|\bhis\b|\byou\b|\byour\b)/.test(q)) {
    return "I have information about Moein's research, education, publications, experience, projects, skills, and contact info. Could you ask more specifically?";
  }
  
  return data.offTopicResponse || "I can only answer questions related to Moein Tash.";
}

// ==========================================
// MAIN ANSWER FUNCTION (tries AI, falls back to rules)
// ==========================================
async function getAnswer(question) {
  // Try AI first
  const aiResponse = await aiAnswer(question);
  if (aiResponse) return aiResponse;
  
  // Fallback to rule-based
  return ruleBasedAnswer(question);
}

// ==========================================
// UI HELPERS
// ==========================================
function getTimeNow() {
  const d = new Date();
  let h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

function getCheckSvg() {
  return '<svg class="check-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/><polyline points="20 12 9 23 4 18"/></svg>';
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function addUserMessage(containerId, text) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const msg = document.createElement('div');
  msg.className = 'message user';
  msg.innerHTML = `
    <div class="msg-avatar">👤</div>
    <div class="msg-bubble-wrap">
      <div class="msg-content">${escapeHtml(text)}</div>
      <div class="msg-time">${getTimeNow()} ${getCheckSvg()}</div>
    </div>
  `;
  container.appendChild(msg);
  container.scrollTop = container.scrollHeight;
}

function addBotMessage(containerId, text) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const msg = document.createElement('div');
  msg.className = 'message bot';
  msg.innerHTML = `
    <div class="msg-avatar">🤖</div>
    <div class="msg-bubble-wrap">
      <div class="msg-content">${escapeHtml(text)}</div>
      <div class="msg-time">${getTimeNow()}</div>
    </div>
  `;
  container.appendChild(msg);
  container.scrollTop = container.scrollHeight;
}

function showTyping(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const msg = document.createElement('div');
  msg.className = 'message bot';
  msg.id = containerId + '-typing';
  msg.innerHTML = `
    <div class="msg-avatar">🤖</div>
    <div class="msg-bubble-wrap">
      <div class="msg-content"><div class="typing-indicator"><span></span><span></span><span></span></div></div>
    </div>
  `;
  container.appendChild(msg);
  container.scrollTop = container.scrollHeight;
}

function removeTyping(containerId) {
  const t = document.getElementById(containerId + '-typing');
  if (t) t.remove();
}

// ==========================================
// GLOBAL FUNCTIONS (called from HTML)
// ==========================================
window.sendMessage = async function() {
  const input = document.getElementById('chatInput');
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  addUserMessage('chatMessages', text);
  input.value = '';
  showTyping('chatMessages');
  
  const answer = await getAnswer(text);
  removeTyping('chatMessages');
  addBotMessage('chatMessages', answer);
};

window.sendFloatingMessage = async function() {
  const input = document.getElementById('floatingInput');
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  addUserMessage('floatingMessages', text);
  input.value = '';
  showTyping('floatingMessages');
  
  const answer = await getAnswer(text);
  removeTyping('floatingMessages');
  addBotMessage('floatingMessages', answer);
};

window.toggleFloatingChat = function() {
  const w = document.getElementById('floatingWindow');
  if (w) w.classList.toggle('active');
};

window.resetChat = function() {
  const messages = document.getElementById('chatMessages');
  if (!messages) return;
  messages.innerHTML = '';
  showInitialGreeting();
};

// ==========================================
// LOAD DATA ON STARTUP
// ==========================================
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadData);
} else {
  loadData();
}
