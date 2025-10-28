 document.querySelectorAll('.nav-item').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const targetId = this.getAttribute('href');
                const targetSection = document.querySelector(targetId);
                if (targetSection) {
                    targetSection.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });

        window.addEventListener('resize', () => {
            const header = document.querySelector('.header');
            document.body.style.setProperty('--header-height', header.offsetHeight + 'px');
        });
        window.dispatchEvent(new Event('resize'));

        const modal = document.getElementById('artGalleryModal');

        function openModal() {
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden'; 
        }

        function closeModal() {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto'; 
        }

        modal.onclick = function(event) {
            if (event.target === modal) {
                closeModal();
            }
        }

        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, observerOptions);

        document.querySelectorAll('.fade-in').forEach(el => {
            observer.observe(el);
        });

        setTimeout(() => {
            document.querySelectorAll('.fade-in').forEach(el => {
                const rect = el.getBoundingClientRect();
                if (rect.top < window.innerHeight && rect.bottom > 0) {
                    el.classList.add('visible');
                }
            });
        }, 100);

        document.addEventListener('DOMContentLoaded', (event) => {

        // const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=" + API_KEY;
        
            let portfolioContext = "";
            let isProcessing = false;

            const chatWindow = document.getElementById('chat-window');
            const chatToggle = document.getElementById('chat-toggle');
            const chatMessages = document.getElementById('chat-messages');
            const userInput = document.getElementById('user-input');
            const sendButton = document.getElementById('send-button');
            const statusMessage = document.getElementById('status-message');

            if (chatToggle && chatWindow && userInput && sendButton && chatMessages) {

                chatToggle.addEventListener('click', () => {
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

                sendButton.addEventListener('click', sendMessage);

                function appendMessage(text, sender) {
                    const msgContainer = document.createElement('div');
                    msgContainer.className = 'flex ' + (sender === 'user' ? 'justify-end' : 'justify-start');
                    
                    const msgBubble = document.createElement('div');
                    msgBubble.className = `text-sm p-3 rounded-xl max-w-[85%] shadow-sm ${
                        sender === 'user' 
                            ? 'bg-indigo-500 text-white rounded-br-none' 
                            : 'bg-gray-200 text-gray-700 rounded-tl-none'
                    }`;
                    msgBubble.textContent = text;
                    msgContainer.appendChild(msgBubble);
                    chatMessages.appendChild(msgContainer);
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                }


                function showTypingIndicator(show) {
                    let indicator = document.getElementById('typing-indicator');
                    if (show) {
                        if (!indicator) {
                            indicator = document.createElement('div');
                            indicator.id = 'typing-indicator';
                            indicator.className = 'text-sm flex justify-start';
                            indicator.innerHTML = '<div class="bg-gray-200 p-3 rounded-xl rounded-tl-none text-gray-700 flex space-x-1"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>';
                            chatMessages.appendChild(indicator);
                        }
                    } else {
                        if (indicator) {
                            indicator.remove();
                        }
                    }
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                }

                async function fetchAndPrepareContext() {
                    statusMessage.textContent = "Loading portfolio context (RAG setup)...";
                    statusMessage.classList.remove('hidden');

                    try {
                        // Read the content of the current document (the page the script is embedded in).
                        const rawText = document.body.innerText || "";
                        
                        // Aggressive cleaning to consolidate whitespace
                        const cleanedText = rawText.replace(/[\n\t\r]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
                        
                        portfolioContext = cleanedText;
                        console.log(`Context loaded from current page's DOM. Size: ${portfolioContext.length} chars.`);

                        userInput.disabled = false;
                        sendButton.disabled = false;
                        statusMessage.textContent = "Assistant is online! Ready to answer questions.";
                        appendMessage("Hello! I'm Prajna's AI assistant. Ask me anything about their experience, projects, or skills!", 'ai');
                        setTimeout(() => statusMessage.classList.add('hidden'), 5000);

                    } catch (error) {
                        console.error("Error setting up portfolio context:", error);
                        statusMessage.textContent = "Error loading context. Chat disabled.";
                        userInput.disabled = true;
                        sendButton.disabled = true;
                    }
                }

                async function sendMessage() {
                    const userText = userInput.value.trim();
                    if (!userText || isProcessing) return;

                    // State management
                    isProcessing = true;
                    appendMessage(userText, 'user');
                    userInput.value = '';
                    userInput.disabled = true;
                    sendButton.disabled = true;
                    // showTypingIndicator(true);
                    // setChatUiDisabled(true);
                    // appendMessage(userText, 'user');
                    // userInput.value = '';
                    showTypingIndicator(true);


                    // --- Prompt Augmentation (RAG Step) ---
                    const systemPrompt = `
                        You are a helpful and professional portfolio assistant for Prajna Bhat, a Data Scientist. 
                        Your goal is to answer questions about Prajna's background, experience, projects, skills, education, and achievements.
                        You MUST use ONLY the following portfolio text as your context. 
                        If you cannot find the answer in the text, you must politely state that the information is not available in the provided portfolio.
                        
                        --- PORTFOLIO CONTEXT ---
                        ${portfolioContext}
                        --- END CONTEXT ---
                    `;

                    const payload = {
                        contents: [{ parts: [{ text: userText }] }],
                        systemInstruction: { parts: [{ text: systemPrompt }] },
                    };

                    let responseText = "Sorry, I encountered an error and could not generate a response. Please try again.";

                    // --- API Call with Exponential Backoff ---
                    try {
                        const response = await fetch('/api/chat', { // <-- CHANGE IS HERE
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                userQuery: userText,
                                portfolioContext: portfolioContext // Send the context
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

                    // Cleanup and display
                    showTypingIndicator(false);
                    appendMessage(responseText, 'ai');

                    isProcessing = false;
                    userInput.disabled = false;
                    sendButton.disabled = false;
                    userInput.focus();
                }

            fetchAndPrepareContext();
        } else {
        console.error("Chatbot UI elements not found. Ensure the HTML IDs are correct and the script runs after the HTML.");
    }
    });