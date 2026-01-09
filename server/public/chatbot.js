(function () {
  // 1. Dynamic Configuration
  // Derives API URL from the script source (e.g., http://myserver.com/chatbot.js -> http://myserver.com/api)
  const scriptSource = document.currentScript.src;
  const baseUrl = new URL(scriptSource).origin;
  const API_URL = `${baseUrl}/api`;

  const userId = document.currentScript.getAttribute('data-user-id');

  if (!userId) {
    console.error('Chatbot Error: No user ID provided');
    return;
  }

  // Inject Custom Font (Inter)
  const fontLink = document.createElement('link');
  fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap';
  fontLink.rel = 'stylesheet';
  document.head.appendChild(fontLink);

  // 2. Create Chatbot UI with Premium Styles
  const createChatbotUI = (brandName) => {
    // Container
    const container = document.createElement('div');
    container.id = 'chatbot-widget-container';
    Object.assign(container.style, {
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      zIndex: '2147483647', // Max z-index
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      gap: '16px'
    });
    document.body.appendChild(container);

    // Toggle Button
    const button = document.createElement('button');
    Object.assign(button.style, {
      width: '60px',
      height: '60px',
      borderRadius: '50%',
      backgroundColor: '#2563EB', // Vibrant Blue
      color: 'white',
      border: 'none',
      boxShadow: '0 8px 24px rgba(37, 99, 235, 0.35)',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      transform: 'scale(0)', // Start hidden for animation
      opacity: '0'
    });
    button.innerHTML = `
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
    `;

    // Main Window (Glassmorphism effect)
    const chatWindow = document.createElement('div');
    Object.assign(chatWindow.style, {
      width: '380px',
      height: '600px',
      maxHeight: '80vh',
      backgroundColor: '#ffffff',
      borderRadius: '20px',
      boxShadow: '0 12px 40px rgba(0, 0, 0, 0.12)',
      overflow: 'hidden',
      display: 'none', // Start hidden
      flexDirection: 'column',
      opacity: '0',
      transform: 'translateY(20px)',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      border: '1px solid rgba(0, 0, 0, 0.05)'
    });

    // Header
    const header = document.createElement('div');
    Object.assign(header.style, {
      background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
      padding: '20px',
      color: 'white',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      boxShadow: '0 2px 10px rgba(37, 99, 235, 0.2)'
    });

    const headerTitle = document.createElement('h3');
    headerTitle.textContent = brandName || 'Chat Support';
    Object.assign(headerTitle.style, {
      margin: '0',
      fontSize: '18px',
      fontWeight: '600',
      letterSpacing: '-0.02em'
    });

    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    `;
    Object.assign(closeBtn.style, {
      background: 'rgba(255,255,255,0.2)',
      border: 'none',
      color: 'white',
      borderRadius: '50%',
      width: '32px',
      height: '32px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      transition: 'background 0.2s'
    });
    closeBtn.onmouseover = () => closeBtn.style.background = 'rgba(255,255,255,0.3)';
    closeBtn.onmouseout = () => closeBtn.style.background = 'rgba(255,255,255,0.2)';

    header.appendChild(headerTitle);
    header.appendChild(closeBtn);
    chatWindow.appendChild(header);

    // Chat Body
    const chatBody = document.createElement('div');
    Object.assign(chatBody.style, {
      flex: '1',
      padding: '20px',
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      backgroundColor: '#F8FAFC' // Light gray background
    });
    chatWindow.appendChild(chatBody);

    // Input Area
    const inputArea = document.createElement('div');
    Object.assign(inputArea.style, {
      padding: '16px',
      backgroundColor: 'white',
      borderTop: '1px solid #EEF2FF',
      display: 'flex',
      gap: '10px'
    });

    const input = document.createElement('input');
    input.placeholder = 'Message...';
    Object.assign(input.style, {
      flex: '1',
      padding: '12px 16px',
      border: '1px solid #E2E8F0',
      borderRadius: '24px',
      fontSize: '15px',
      outline: 'none',
      fontFamily: 'inherit',
      transition: 'border-color 0.2s'
    });
    input.onfocus = () => input.style.borderColor = '#2563EB';
    input.onblur = () => input.style.borderColor = '#E2E8F0';

    const sendBtn = document.createElement('button');
    Object.assign(sendBtn.style, {
      background: '#2563EB',
      color: 'white',
      border: 'none',
      borderRadius: '50%',
      width: '44px',
      height: '44px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      boxShadow: '0 2px 8px rgba(37, 99, 235, 0.2)',
      transition: 'transform 0.2s'
    });
    sendBtn.onmousedown = () => sendBtn.style.transform = 'scale(0.95)';
    sendBtn.onmouseup = () => sendBtn.style.transform = 'scale(1)';
    sendBtn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="22" y1="2" x2="11" y2="13"></line>
        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
      </svg>
    `;

    inputArea.appendChild(input);
    inputArea.appendChild(sendBtn);
    chatWindow.appendChild(inputArea);

    container.appendChild(chatWindow);
    container.appendChild(button); // Button below window

    // State & Animations
    let isOpen = false;

    const toggleChat = () => {
      isOpen = !isOpen;
      if (isOpen) {
        chatWindow.style.display = 'flex';
        // Need frame for transition
        requestAnimationFrame(() => {
          chatWindow.style.opacity = '1';
          chatWindow.style.transform = 'translateY(0)';
        });
        button.style.transform = 'scale(0.8) rotate(90deg)';
        button.innerHTML = `
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        `;
      } else {
        chatWindow.style.opacity = '0';
        chatWindow.style.transform = 'translateY(20px)';
        setTimeout(() => {
          if (!isOpen) chatWindow.style.display = 'none';
        }, 300);
        button.style.transform = 'scale(1) rotate(0deg)';
        button.innerHTML = `
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        `;
      }
    };

    button.onclick = toggleChat;
    closeBtn.onclick = toggleChat;

    // Entrance Animation for Button
    setTimeout(() => {
      button.style.opacity = '1';
      button.style.transform = 'scale(1)';
    }, 500);

    return { chatBody, input, sendBtn };
  };

  // Helper: Message Bubbles
  const addMessage = (target, type, text) => {
    const bubble = document.createElement('div');
    Object.assign(bubble.style, {
      maxWidth: '85%',
      padding: '12px 16px',
      borderRadius: '16px',
      fontSize: '14px',
      lineHeight: '1.5',
      position: 'relative',
      wordWrap: 'break-word',
      animation: 'fadeIn 0.3s ease-out'
    });

    if (type === 'user') {
      Object.assign(bubble.style, {
        alignSelf: 'flex-end',
        backgroundColor: '#2563EB',
        color: 'white',
        borderBottomRightRadius: '4px'
      });
    } else {
      Object.assign(bubble.style, {
        alignSelf: 'flex-start',
        backgroundColor: 'white',
        color: '#1E293B',
        border: '1px solid #E2E8F0',
        borderBottomLeftRadius: '4px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
      });
    }

    bubble.innerText = text;
    target.appendChild(bubble);
    target.scrollTop = target.scrollHeight;
  };

  // Helper: Typing Indicator
  const addTyping = (target) => {
    const loader = document.createElement('div');
    loader.id = 'chatbot-typing-indicator';
    Object.assign(loader.style, {
      alignSelf: 'flex-start',
      backgroundColor: 'white',
      padding: '12px 16px',
      borderRadius: '16px',
      borderBottomLeftRadius: '4px',
      border: '1px solid #E2E8F0',
      display: 'flex',
      gap: '4px',
      alignItems: 'center',
      width: 'fit-content'
    });

    [0, 1, 2].forEach(i => {
      const dot = document.createElement('div');
      Object.assign(dot.style, {
        width: '6px',
        height: '6px',
        backgroundColor: '#94A3B8',
        borderRadius: '50%',
        animation: `bounce 1.4s infinite ease-in-out both ${i * 0.16}s`
      });
      loader.appendChild(dot);
    });

    // Inject Keyframes for dots & fade
    const styleSheet = document.createElement('style');
    styleSheet.innerText = `
      @keyframes bounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }
      @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    `;
    document.head.appendChild(styleSheet);

    target.appendChild(loader);
    target.scrollTop = target.scrollHeight; // Scroll to bottom
    return loader;
  };

  // Logic: Initialize
  const init = async () => {
    try {
      // Fetch Brand Info / Status
      const res = await fetch(`${API_URL}/chatbot/${userId}`);
      const data = await res.json();

      if (!res.ok) {
        console.warn(`Chatbot: ${data.message || 'Unavailable'}`);
        return;
      }

      const { chatBody, input, sendBtn } = createChatbotUI(data.name);

      const handleSend = async () => {
        const text = input.value.trim();
        if (!text) return;

        input.value = '';
        addMessage(chatBody, 'user', text);

        const loader = addTyping(chatBody);

        try {
          const apiRes = await fetch(`${API_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, message: text })
          });
          const apiData = await apiRes.json();

          loader.remove(); // Remove typing

          if (apiRes.ok) {
            addMessage(chatBody, 'bot', apiData.answer);
          } else {
            addMessage(chatBody, 'bot', apiData.message || "Something went wrong.");
          }

        } catch (err) {
          console.error(err);
          loader.remove();
          addMessage(chatBody, 'bot', "Network error. Please try again.");
        }
      };

      sendBtn.onclick = handleSend;
      input.onkeypress = (e) => { if (e.key === 'Enter') handleSend(); };

      // Welcome Message (Optional: delay slightly)
      setTimeout(() => {
        addMessage(chatBody, 'bot', `Hello! Welcome to ${data.name || 'our support'}. How can I help you today?`);
      }, 800);

    } catch (e) {
      console.error('Chatbot init failed:', e);
    }
  };

  if (document.readyState === 'complete') init();
  else window.addEventListener('load', init);

})();
