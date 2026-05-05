// ==========================================
// MOEIN'S AI ASSISTANT - HYBRID CHATBOT
// ==========================================
// Tries Gemini AI (via Cloudflare Worker) first.
// Falls back to rule-based if AI is unavailable.
// API key is SECRET - hidden inside Cloudflare Worker.
// Multilingual: AI responds in the same language as the question.
// ==========================================

const CONFIG = {
  WORKER_URL: "https://moein-ai-proxy.moein-tash.workers.dev"
};

window.CV_DATA = null;

// Fallback (in case data.json fails to load)
const FALLBACK_DATA = {
  chatbotKnowledge: [
    {
      keywords: ["research", "moein"],
      answer: "Moein Tash is a PhD researcher in NLP at IPN Mexico City, focusing on social media mining, sentiment analysis, and hate/hope speech detection."
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
// BUILD RICH CONTEXT FOR AI (entire CV)
// ==========================================
function buildContextForAI() {
  const data = window.CV_DATA;
  if (!data) return "";
  
  let ctx = "";
  
  // Personal
  if (data.personal) {
    const p = data.personal;
    ctx += `=== PERSONAL ===\n`;
    ctx += `Full Name: ${p.fullName || p.name}\n`;
    ctx += `Title: ${p.title}\n`;
    if (p.tagline) ctx += `Bio: ${p.tagline}\n`;
    if (p.email) ctx += `Email: ${p.email}\n`;
    if (p.location) ctx += `Location: ${p.location}\n`;
    if (p.languages) ctx += `Languages: ${p.languages}\n`;
    if (p.currentPosition) ctx += `Current Position: ${p.currentPosition}\n`;
    if (p.currentResearchPosition) ctx += `Research Position: ${p.currentResearchPosition}\n`;
    if (p.linkedin) ctx += `LinkedIn: ${p.linkedin}\n`;
    if (p.scholar) ctx += `Google Scholar: ${p.scholar}\n`;
    if (p.github) ctx += `GitHub: ${p.github}\n`;
  }
  
  // Education
  if (data.education?.length) {
    ctx += `\n=== EDUCATION ===\n`;
    data.education.forEach(e => {
      ctx += `- ${e.degree} at ${e.institution} (${e.period})${e.note ? ' - '+e.note : ''}\n`;
    });
  }
  
  // Experience
  if (data.experience?.length) {
    ctx += `\n=== EXPERIENCE ===\n`;
    data.experience.forEach(e => {
      ctx += `- ${e.role} at ${e.company} (${e.period}): ${e.details}\n`;
    });
  }
  
  // Publications
  if (data.publications) {
    const pub = data.publications;
    const pubCount = (pub.published?.length || 0);
    const reviewCount = (pub.underReview?.length || 0);
    const confCount = (pub.conferences?.length || 0);
    ctx += `\n=== PUBLICATIONS ===\n`;
    ctx += `Total: ${pubCount} published journal papers, ${reviewCount} under review, ${confCount} conference papers.\n\n`;
    
    if (pub.published?.length) {
      ctx += `PUBLISHED JOURNAL PAPERS:\n`;
      pub.published.forEach(p => {
        ctx += `- "${p.title}" by ${p.authors}, ${p.venue}`;
        if (p.quartile) ctx += ` (${p.quartile}`;
        if (p.impactFactor) ctx += `, IF: ${p.impactFactor}`;
        if (p.quartile) ctx += `)`;
        if (p.year) ctx += `, ${p.year}`;
        if (p.link) ctx += ` [PDF: ${p.link}]`;
        ctx += `\n`;
      });
    }
    
    if (pub.underReview?.length) {
      ctx += `\nUNDER REVIEW:\n`;
      pub.underReview.forEach(p => {
        ctx += `- "${p.title}" by ${p.authors}, ${p.venue}`;
        if (p.link) ctx += ` [Link: ${p.link}]`;
        ctx += `\n`;
      });
    }
    
    if (pub.conferences?.length) {
      ctx += `\nCONFERENCE PAPERS:\n`;
      pub.conferences.forEach(p => {
        ctx += `- "${p.title}" by ${p.authors}, ${p.venue}`;
        if (p.link) ctx += ` [Link: ${p.link}]`;
        ctx += `\n`;
      });
    }
  }
  
  // Projects
  if (data.projects?.length) {
    ctx += `\n=== PROJECTS ===\n`;
    data.projects.forEach(p => {
      ctx += `- ${p.title}: ${p.description}`;
      if (p.tags?.length) ctx += ` [Tech: ${p.tags.join(', ')}]`;
      if (p.link) ctx += ` [Link: ${p.link}]`;
      ctx += `\n`;
    });
  }
  
  // Skills
  if (data.skills) {
    ctx += `\n=== SKILLS ===\n`;
    if (data.skills.technical?.length) ctx += `Technical: ${data.skills.technical.join(', ')}\n`;
    if (data.skills.nlp?.length) ctx += `NLP Expertise: ${data.skills.nlp.join(', ')}\n`;
    if (data.skills.languages?.length) {
      ctx += `Languages spoken: ${data.skills.languages.map(l => `${l.name} (${l.level})`).join(', ')}\n`;
    }
  }
  
  // Achievements
  if (data.achievements?.length) {
    ctx += `\n=== ACHIEVEMENTS ===\n`;
    data.achievements.forEach(a => ctx += `- ${a}\n`);
  }
  
  return ctx;
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
  
  // Multilingual greetings
  if (/^(hi|hello|hey|hola|salam|سلام|bonjour|namaste|你好|こんにちは)\b/.test(q)) {
    return "Hello! 👋 I'm Moein's AI assistant. Ask me anything about his research, education, publications, or background!";
  }
  
  if (/(thank|thanks|gracias|merci|متشکرم|ممنون|شکرا|谢谢|ありがとう)/.test(q)) {
    return "You're welcome! Feel free to ask anything else about Moein.";
  }
  
  let bestMatch = null;
  let bestScore = 0;
  
  for (const entry of (data.chatbotKnowledge || [])) {
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
  
  if (/(moein|tash|shahiki|\bhe\b|\bhim\b|\bhis\b|\byou\b|\byour\b|معین|تاش)/.test(q)) {
    return "I have information about Moein's research, education, publications, experience, projects, skills, and contact info. Could you ask more specifically?";
  }
  
  return data.offTopicResponse || "I can only answer questions related to Moein Tash.";
}

// ==========================================
// MAIN ANSWER FUNCTION
// ==========================================
async function getAnswer(question) {
  const aiResponse = await aiAnswer(question);
  if (aiResponse) return aiResponse;
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

// Render bot messages with markdown-style links: [text](url)
function renderBotContent(text) {
  let safe = escapeHtml(text);
  // Convert [link text](url) → <a>
  safe = safe.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" style="color:var(--primary);text-decoration:underline;">$1</a>');
  // Auto-link plain URLs
  safe = safe.replace(/(^|\s)(https?:\/\/[^\s<]+)/g, '$1<a href="$2" target="_blank" rel="noopener" style="color:var(--primary);text-decoration:underline;">$2</a>');
  return safe;
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
      <div class="msg-content">${renderBotContent(text)}</div>
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
// GLOBAL FUNCTIONS
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

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadData);
} else {
  loadData();
}
