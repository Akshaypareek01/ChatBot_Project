
(function() {
    // Configuration
    const API_URL = 'http://localhost:5000/api';
    const AI_API_URL = "https://api.openai.com/v1/chat/completions"; // Replace with your AI API endpoint
  const AI_API_KEY = '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'; // Replace with your actual API key
  const userId = document.currentScript.getAttribute('data-user-id');
    
    if (!userId) {
      console.error('Chatbot Error: No user ID provided');
      return;
    }
    console.log("Chat bot is live")
    // Create chatbot container
    const createChatbotUI = () => {
      // Create container
      const container = document.createElement('div');
      container.id = 'external-chatbot-container';
      container.style.position = 'fixed';
      container.style.bottom = '20px';
      container.style.right = '20px';
      container.style.zIndex = '9999';
      document.body.appendChild(container);
      
      // Create button
      const button = document.createElement('button');
      button.id = 'external-chatbot-button';
      button.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';
      button.style.width = '50px';
      button.style.height = '50px';
      button.style.borderRadius = '50%';
      button.style.backgroundColor = '#4C6EF5';
      button.style.color = 'white';
      button.style.border = 'none';
      button.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
      button.style.cursor = 'pointer';
      button.style.display = 'flex';
      button.style.alignItems = 'center';
      button.style.justifyContent = 'center';
      button.style.transition = 'transform 0.3s ease';
      container.appendChild(button);
      
      // Chat window
      const chatWindow = document.createElement('div');
      chatWindow.id = 'external-chatbot-window';
      chatWindow.style.display = 'none';
      chatWindow.style.width = '350px';
      chatWindow.style.height = '450px';
      chatWindow.style.backgroundColor = 'white';
      chatWindow.style.borderRadius = '12px';
      chatWindow.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.1)';
      chatWindow.style.overflow = 'hidden';
      chatWindow.style.display = 'none';
      chatWindow.style.flexDirection = 'column';
      chatWindow.style.marginBottom = '16px';
      container.appendChild(chatWindow);
      
      // Chat header
      const chatHeader = document.createElement('div');
      chatHeader.style.backgroundColor = '#4C6EF5';
      chatHeader.style.color = 'white';
      chatHeader.style.padding = '12px 16px';
      chatHeader.style.display = 'flex';
      chatHeader.style.justifyContent = 'space-between';
      chatHeader.style.alignItems = 'center';
      chatWindow.appendChild(chatHeader);
      
      const title = document.createElement('div');
      title.innerText = 'Chat Support';
      title.style.fontWeight = 'bold';
      chatHeader.appendChild(title);
      
      const closeButton = document.createElement('button');
      closeButton.innerHTML = '&times;';
      closeButton.style.backgroundColor = 'transparent';
      closeButton.style.border = 'none';
      closeButton.style.color = 'white';
      closeButton.style.fontSize = '20px';
      closeButton.style.cursor = 'pointer';
      chatHeader.appendChild(closeButton);
      
      // Chat body
      const chatBody = document.createElement('div');
      chatBody.id = 'external-chatbot-messages';
      chatBody.style.flexGrow = '1';
      chatBody.style.padding = '16px';
      chatBody.style.overflowY = 'auto';
      chatBody.style.display = 'flex';
      chatBody.style.flexDirection = 'column';
      chatBody.style.gap = '12px';
      chatWindow.appendChild(chatBody);
      
      // Input area
      const inputContainer = document.createElement('div');
      inputContainer.style.borderTop = '1px solid #eee';
      inputContainer.style.padding = '12px';
      inputContainer.style.display = 'flex';
      inputContainer.style.gap = '8px';

      chatWindow.appendChild(inputContainer);
      
      const input = document.createElement('input');
      input.id = 'external-chatbot-input';
      input.type = 'text';
      input.placeholder = 'Type your message...';
      input.style.flexGrow = '1';
      input.style.padding = '8px 12px';
      input.style.border = '1px solid #ddd';
      input.style.borderRadius = '20px';
      input.style.outline = 'none';
      input.addEventListener('input', () => {
        if (input.value.length > 25) {
            input.value = input.value.substring(0,25);
        }});
      inputContainer.appendChild(input);
      
      const sendButton = document.createElement('button');
      sendButton.id = 'external-chatbot-send';
      sendButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>';
      sendButton.style.width = '36px';
      sendButton.style.height = '36px';
      sendButton.style.borderRadius = '50%';
      sendButton.style.backgroundColor = '#4C6EF5';
      sendButton.style.color = 'white';
      sendButton.style.border = 'none';
      sendButton.style.display = 'flex';
      sendButton.style.alignItems = 'center';
      sendButton.style.justifyContent = 'center';
      sendButton.style.cursor = 'pointer';
      inputContainer.appendChild(sendButton);
      
      // Toggle chat window
      button.addEventListener('click', () => {
        if (chatWindow.style.display === 'none') {
          chatWindow.style.display = 'flex';
          button.style.transform = 'scale(0.9)';
        } else {
          chatWindow.style.display = 'none';
          button.style.transform = 'scale(1)';
        }
      });
      
      // Close chat window
      closeButton.addEventListener('click', () => {
        chatWindow.style.display = 'none';
        button.style.transform = 'scale(1)';
      });
      
      // Add welcome message
      addMessage('bot', 'Hi there! How can I help you today?');
      
      return { chatBody, input, sendButton };
    };
    
    // Add message to chat
    const addMessage = (sender, content) => {
      const chatBody = document.getElementById('external-chatbot-messages');
      
      const message = document.createElement('div');
      message.className = `external-chatbot-message ${sender}`;
      message.style.maxWidth = '80%';
      message.style.padding = '10px 14px';
      message.style.borderRadius = '18px';
      message.style.wordBreak = 'break-word';
      
      if (sender === 'user') {
        message.style.alignSelf = 'flex-end';
        message.style.backgroundColor = '#4C6EF5';
        message.style.color = 'white';
      } else {
        message.style.alignSelf = 'flex-start';
        message.style.backgroundColor = '#f1f3f5';
        message.style.color = '#333';
      }
      
      message.innerText = content;
      chatBody.appendChild(message);
      chatBody.scrollTop = chatBody.scrollHeight;
    };
    
    // Add typing indicator
    const addTypingIndicator = () => {
      const chatBody = document.getElementById('external-chatbot-messages');
      
      const indicator = document.createElement('div');
      indicator.id = 'external-chatbot-typing';
      indicator.style.alignSelf = 'flex-start';
      indicator.style.backgroundColor = '#f1f3f5';
      indicator.style.borderRadius = '18px';
      indicator.style.padding = '12px 14px';
      indicator.style.display = 'flex';
      indicator.style.gap = '4px';
      
      for (let i = 0; i < 3; i++) {
        const dot = document.createElement('div');
        dot.style.width = '8px';
        dot.style.height = '8px';
        dot.style.backgroundColor = '#888';
        dot.style.borderRadius = '50%';
        dot.style.opacity = '0.6';
        dot.style.animation = 'external-chatbot-pulse 1s infinite';
        dot.style.animationDelay = `${i * 0.2}s`;
        indicator.appendChild(dot);
      }
      
      chatBody.appendChild(indicator);
      chatBody.scrollTop = chatBody.scrollHeight;
      
      return indicator;
    };
    
    // Remove typing indicator
    const removeTypingIndicator = () => {
      const indicator = document.getElementById('external-chatbot-typing');
      if (indicator) {
        indicator.remove();
      }
    };

    const getAIResponse = async (message) => {
        try {
            const response = await fetch(AI_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${AI_API_KEY}`
                },
                body: JSON.stringify({
                    model: "gpt-4o-mini",
                    messages: [
                        { role: 'system', content: 'chatbot Reply in 10 words or fewer' },
                        { role: 'user', content: message }
                    ],
                    max_tokens: 20 // Keeping a safe limit while ensuring brevity
                })
            });
    
            const data = await response.json();
            return data.choices[0]?.message?.content || "I'm not sure, but I'll find out!";
        } catch (error) {
            console.error('AI Error:', error);
            return "Sorry, I couldn't generate a response right now.";
        }
    };
    
    // Initialize the chatbot
    const init = async () => {
        try {
          const response = await fetch(`${API_URL}/chatbot/${userId}`);
          const data = await response.json();
          if (!response.ok) {
            console.error('Chatbot Error:', data.message);
            return;
          }
          const { chatBody, input, sendButton } = createChatbotUI();
          
          const sendMessage = async () => {
            const message = input.value.trim();
            if (!message) return;
            addMessage('user', message);
            input.value = '';
            const indicator = addTypingIndicator();
    
            const qa = data.qas.find(qa => 
              qa.question.toLowerCase().includes(message.toLowerCase()) || 
              message.toLowerCase().includes(qa.question.toLowerCase())
            );
    
            setTimeout(async () => {
              removeTypingIndicator();
              if (qa) {
                fetch(`${API_URL}/chatbot/frequency`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ qaId: qa._id })
                });
                addMessage('bot', qa.answer);
              } else {
                fetch(`${API_URL}/chatbot/log`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ userId, question: message })
                });
                const aiResponse = await getAIResponse(message);
                addMessage('bot', aiResponse);
              }
            }, 1000 + Math.random() * 1000);
          };
    
          sendButton.addEventListener('click', sendMessage);
          input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
          });
    
        } catch (error) {
          console.error('Chatbot Error:', error);
        }
      };
    
    // Load chatbot
    if (document.readyState === 'complete') {
      init();
    } else {
      window.addEventListener('load', init);
    }
  })();
  