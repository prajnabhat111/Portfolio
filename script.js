// Mobile Navigation Toggle
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const primaryNav = document.getElementById('primary-nav');

if (mobileMenuBtn && primaryNav) {
    mobileMenuBtn.addEventListener('click', () => {
        primaryNav.classList.toggle('open');
    });
}

// Smooth Anchor Scrolling + Close Mobile Drawer
document.querySelectorAll('.nav-item, .btn-primary').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const targetId = this.getAttribute('href');
        if (targetId && targetId.startsWith('#')) {
            e.preventDefault();
            if (primaryNav) primaryNav.classList.remove('open');
            const targetSection = document.querySelector(targetId);
            if (targetSection) {
                targetSection.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        }
    });
});

// Keep scroll offset synced with header height
window.addEventListener('resize', () => {
    const header = document.querySelector('.header');
    if (header) {
        document.body.style.setProperty('--header-height', header.offsetHeight + 'px');
    }
});
window.dispatchEvent(new Event('resize'));

// Interactive Project Domain Filter
const filterButtons = document.querySelectorAll('.filter-btn');
const projectCards = document.querySelectorAll('.project-card');

filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        filterButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const selectedFilter = btn.getAttribute('data-filter');
        projectCards.forEach(card => {
            const category = card.getAttribute('data-category');
            if (selectedFilter === 'all' || category === selectedFilter) {
                card.classList.remove('hidden-project');
            } else {
                card.classList.add('hidden-project');
            }
        });
    });
});

// Interactive Experience Tabs
const expTabButtons = document.querySelectorAll('.exp-tab-btn');
const expPanels = document.querySelectorAll('.exp-panel');

expTabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-target');

        expTabButtons.forEach(b => {
            b.classList.remove('active');
            b.setAttribute('aria-selected', 'false');
        });
        expPanels.forEach(panel => panel.classList.remove('active'));

        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');
        const targetPanel = document.getElementById(targetId);
        if (targetPanel) targetPanel.classList.add('active');
    });
});

// Art Gallery Modal
const modal = document.getElementById('artGalleryModal');

function openModal() {
    if (!modal) return;
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    if (!modal) return;
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

if (modal) {
    modal.onclick = function (event) {
        if (event.target === modal) {
            closeModal();
        }
    };
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal && modal.style.display === 'block') {
        closeModal();
    }
});

// Scroll Reveal Observer
const observerOptions = {
    threshold: 0.08,
    rootMargin: '0px 0px -40px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
        }
    });
}, observerOptions);

document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));

setTimeout(() => {
    document.querySelectorAll('.fade-in').forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) {
            el.classList.add('visible');
        }
    });
}, 100);

// RAG Portfolio Chatbot
document.addEventListener('DOMContentLoaded', () => {
    let isProcessing = false;
    const STORAGE_KEY = 'prajna_portfolio_chat_history';

    const chatWindow = document.getElementById('chat-window');
    const chatToggle = document.getElementById('chat-toggle');
    const chatMessages = document.getElementById('chat-messages');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const statusMessage = document.getElementById('status-message');

    // Load saved messages for this browser tab session
    let chatHistory = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]');

    function saveHistory() {
        // Keep the last 12 messages so requests stay fast and within token limits
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(chatHistory.slice(-12)));
    }

    function formatBotReply(text) {
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
            .replace(/(^|\n)[-*]\s+/g, "$1• ")
            .replace(/\n/g, "<br>");
    }

    if (chatToggle && chatWindow && userInput && sendButton && chatMessages) {
        chatToggle.addEventListener('click', (e) => {
            e.preventDefault(); // Prevents accidental form submit or anchor jump
            chatWindow.classList.toggle('hidden');
            if (!chatWindow.classList.contains('hidden')) {
                userInput.focus();
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }
        });

        userInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                sendMessage();
            }
        });

        sendButton.addEventListener('click', (e) => {
            e.preventDefault();
            sendMessage();
        });

        function appendMessage(text, sender, shouldSave = true) {
            const msgContainer = document.createElement('div');
            msgContainer.className = 'flex ' + (sender === 'user' ? 'justify-end' : 'justify-start');

            const msgBubble = document.createElement('div');
            msgBubble.className = `text-sm p-3 rounded-xl max-w-[85%] shadow-sm ${
                sender === 'user'
                    ? 'bg-blue-700 text-white rounded-br-none'
                    : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'
            }`;

            if (sender === 'ai') {
                msgBubble.innerHTML = formatBotReply(text);
            } else {
                msgBubble.textContent = text;
            }

            msgContainer.appendChild(msgBubble);
            chatMessages.appendChild(msgContainer);
            chatMessages.scrollTop = chatMessages.scrollHeight;

            if (shouldSave) {
                chatHistory.push({
                    role: sender === 'user' ? 'user' : 'assistant',
                    content: text
                });
                saveHistory();
            }
        }

        function showTypingIndicator(show) {
            let indicator = document.getElementById('typing-indicator');
            if (show) {
                if (!indicator) {
                    indicator = document.createElement('div');
                    indicator.id = 'typing-indicator';
                    indicator.className = 'text-sm flex justify-start';
                    indicator.innerHTML = '<div class="bg-white border border-slate-200 p-3 rounded-xl rounded-tl-none flex space-x-1"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>';
                    chatMessages.appendChild(indicator);
                }
            } else if (indicator) {
                indicator.remove();
            }
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }

        function initChat() {
            userInput.disabled = false;
            sendButton.disabled = false;
            if (statusMessage) {
                statusMessage.textContent = "Assistant online";
                statusMessage.classList.remove('hidden');
                setTimeout(() => statusMessage.classList.add('hidden'), 4000);
            }

            if (chatHistory.length > 0) {
                // Restore existing session messages without duplicating them in storage
                chatHistory.forEach(msg => {
                    appendMessage(msg.content, msg.role === 'user' ? 'user' : 'ai', false);
                });
            } else {
                appendMessage("Hello! I'm Prajna's AI assistant. Ask me anything about her experience, projects, or tech stack!", 'ai', true);
            }
        }

        async function sendMessage() {
            const userText = userInput.value.trim();
            if (!userText || isProcessing) return;

            isProcessing = true;
            // Send prior turns so the AI understands follow-up questions
            const historyToSend = chatHistory.slice(-6);

            appendMessage(userText, 'user', true);
            userInput.value = '';
            userInput.disabled = true;
            sendButton.disabled = true;
            showTypingIndicator(true);

            let responseText = "Sorry, I encountered an error and could not generate a response. Please try again.";

            try {
                const response = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userQuery: userText,
                        history: historyToSend
                    })
                });

                if (response.ok) {
                    const result = await response.json();
                    responseText = result.answer;
                } else {
                    throw new Error(`API returned status ${response.status}`);
                }
            } catch (e) {
                console.error("Error calling proxy API:", e);
            }

            showTypingIndicator(false);
            appendMessage(responseText, 'ai', true);

            isProcessing = false;
            userInput.disabled = false;
            sendButton.disabled = false;
            userInput.focus();
        }

        initChat();
    }
});