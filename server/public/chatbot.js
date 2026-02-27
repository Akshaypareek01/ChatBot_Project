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

  // 1.5 Google Translate Integration (Legacy Free Method)
  const injectTranslateScript = () => {
    const gDiv = document.createElement('div');
    gDiv.id = 'google_translate_element';
    gDiv.style.display = 'none';
    document.body.appendChild(gDiv);

    // Style to hide Google's default UI elements and custom scrollbars
    const style = document.createElement('style');
    style.innerHTML = `
      .goog-te-banner-frame.skiptranslate, .goog-te-gadget-icon, .goog-te-gadget-simple span { display: none !important; }
      body { top: 0px !important; }
      .goog-te-menu-value { display: none !important; }
      .skiptranslate { display: none !important; }
      iframe.goog-te-menu-frame { display: none !important; }
      #google_translate_element { display: none !important; }
      .goog-tooltip { display: none !important; }
      .goog-tooltip:hover { display: none !important; }
      .goog-text-highlight { background-color: transparent !important; box-shadow: none !important; }
      
      /* Neural Slim Scrollbars */
      #neural-chat-body::-webkit-scrollbar, 
      #neural-lang-body::-webkit-scrollbar {
        width: 4px;
      }
      #neural-chat-body::-webkit-scrollbar-track, 
      #neural-lang-body::-webkit-scrollbar-track {
        background: rgba(255, 255, 255, 0.02);
      }
      #neural-chat-body::-webkit-scrollbar-thumb, 
      #neural-lang-body::-webkit-scrollbar-thumb {
        background: rgba(34, 211, 238, 0.3);
        border-radius: 10px;
        transition: background 0.3s;
      }
      #neural-chat-body::-webkit-scrollbar-thumb:hover, 
      #neural-lang-body::-webkit-scrollbar-thumb:hover {
        background: rgba(34, 211, 238, 0.8);
        box-shadow: 0 0 10px rgba(34, 211, 238, 0.5);
      }
    `;
    document.head.appendChild(style);

    window.googleTranslateElementInit = function () {
      new google.translate.TranslateElement({
        pageLanguage: 'en',
        layout: google.translate.TranslateElement.InlineLayout.SIMPLE,
        autoDisplay: false
      }, 'google_translate_element');
    };

    const script = document.createElement('script');
    script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    document.head.appendChild(script);
  };

  const changeLanguage = (langCode) => {
    // 1. Update the cookie that Google Translate uses
    // Format: /source_lang/target_lang
    document.cookie = `googtrans=/en/${langCode}; path=/`;
    document.cookie = `googtrans=/en/${langCode}; path=/; domain=${window.location.hostname}`;

    // 2. Try to trigger the dropdown if it exists
    const select = document.querySelector('.goog-te-combo');
    if (select) {
      select.value = langCode;
      select.dispatchEvent(new Event('change'));
    } else {
      // 3. Fallback: If engine isn't ready, reload with the cookie set
      window.location.reload();
    }
  };

  // 2. Create Chatbot UI with Premium Styles (data = { name, widgetConfig? })
  const createChatbotUI = (data) => {
    const brandName = data.widgetConfig?.botName || data.name || 'AI Agent';
    const cfg = data.widgetConfig || {};
    const primaryColor = cfg.primaryColor || '#2563EB';
    const accentColor = cfg.accentColor || '#22D3EE';
    const isLeft = cfg.position === 'bottom-left';
    const widthMap = { compact: '320px', standard: '400px', large: '480px' };
    const chatWidth = widthMap[cfg.size] || '400px';

    // Container (position: bottom-left or bottom-right)
    const container = document.createElement('div');
    container.id = 'chatbot-widget-container';
    Object.assign(container.style, {
      position: 'fixed',
      bottom: '24px',
      [isLeft ? 'left' : 'right']: '24px',
      zIndex: '2147483647',
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      alignItems: isLeft ? 'flex-start' : 'flex-end',
      gap: '16px'
    });
    document.body.appendChild(container);

    // Toggle Button (primary color)
    const button = document.createElement('button');
    Object.assign(button.style, {
      width: '60px',
      height: '60px',
      borderRadius: '50%',
      backgroundColor: primaryColor,
      color: 'white',
      border: 'none',
      boxShadow: `0 8px 24px ${primaryColor}59`,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      transform: 'scale(0)',
      opacity: '0'
    });
    button.innerHTML = `
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
    `;

    button.onmouseenter = () => {
      if (!isOpen) {
        button.style.transform = 'scale(1.1)';
        button.style.boxShadow = `0 10px 30px ${primaryColor}73`;
      }
    };
    button.onmouseleave = () => {
      if (!isOpen) {
        button.style.transform = 'scale(1)';
        button.style.boxShadow = `0 8px 24px ${primaryColor}59`;
      }
    };

    // State
    let isOpen = false;

    // 2. Chat Drawer Backdrop
    const backdrop = document.createElement('div');
    Object.assign(backdrop.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0,0,0,0.6)',
      backdropFilter: 'blur(4px)',
      zIndex: '2147483648',
      display: 'none',
      opacity: '0',
      transition: 'opacity 0.4s ease'
    });
    document.body.appendChild(backdrop);

    // 3. Main Chat Drawer (slide from left or right by position)
    const chatWindow = document.createElement('div');
    chatWindow.className = 'notranslate';
    const slideKey = isLeft ? 'left' : 'right';
    const slideHidden = isLeft ? '-420px' : '-420px';
    Object.assign(chatWindow.style, {
      position: 'fixed',
      top: '0',
      [slideKey]: slideHidden,
      width: chatWidth,
      maxWidth: '90vw',
      height: '100%',
      backgroundColor: '#0B0F17',
      zIndex: '2147483649',
      boxShadow: '0 0 32px rgba(0,0,0,0.5)',
      display: 'flex',
      flexDirection: 'column',
      transition: `${slideKey} 0.4s cubic-bezier(0.4, 0, 0.2, 1)`,
      fontFamily: '"Inter", "JetBrains Mono", monospace'
    });

    // Header (Futuristic Neural Style)
    const header = document.createElement('div');
    Object.assign(header.style, {
      padding: '24px',
      background: '#0F172A',
      borderBottom: '1px solid rgba(34, 211, 238, 0.1)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      position: 'relative'
    });

    const headerTitleContainer = document.createElement('div');
    headerTitleContainer.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px;">
        <div style="width: 8px; height: 8px; border-radius: 50%; background: ${accentColor}; box-shadow: 0 0 10px ${accentColor};"></div>
        <h3 style="margin:0; font-size: 14px; color: white; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em;">${brandName}</h3>
      </div>
    `;

    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '✕';
    Object.assign(closeBtn.style, {
      background: 'rgba(255,255,255,0.05)',
      border: '1px solid rgba(255,255,255,0.1)',
      color: 'white',
      borderRadius: '8px',
      padding: '8px 12px',
      cursor: 'pointer',
      fontSize: '14px',
      transition: 'all 0.2s'
    });
    closeBtn.onmouseover = () => {
      closeBtn.style.background = 'rgba(255,255,255,0.1)';
      closeBtn.style.borderColor = '#22D3EE';
    };
    closeBtn.onmouseout = () => {
      closeBtn.style.background = 'rgba(255,255,255,0.05)';
      closeBtn.style.borderColor = 'rgba(255,255,255,0.1)';
    };

    header.appendChild(headerTitleContainer);
    header.appendChild(closeBtn);
    chatWindow.appendChild(header);

    // Chat Body
    const chatBody = document.createElement('div');
    chatBody.id = 'neural-chat-body';
    Object.assign(chatBody.style, {
      flex: '1',
      padding: '24px',
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
      backgroundColor: '#0B0F17' // Neural Dark
    });
    chatWindow.appendChild(chatBody);

    // Input Area
    const inputArea = document.createElement('div');
    Object.assign(inputArea.style, {
      padding: '20px',
      backgroundColor: '#0F172A',
      borderTop: '1px solid rgba(34, 211, 238, 0.1)',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    });

    const inputWrapper = document.createElement('div');
    Object.assign(inputWrapper.style, {
      display: 'flex',
      gap: '10px',
      alignItems: 'center'
    });

    const input = document.createElement('input');
    input.placeholder = 'Inquire Neural Agent...';
    Object.assign(input.style, {
      flex: '1',
      padding: '12px 16px',
      border: '1px solid rgba(255,255,255,0.1)',
      backgroundColor: 'rgba(255,255,255,0.03)',
      borderRadius: '12px',
      fontSize: '14px',
      color: 'white',
      outline: 'none',
      fontFamily: 'inherit',
      transition: 'all 0.2s'
    });
    input.onfocus = () => {
      input.style.borderColor = '#22D3EE';
      input.style.backgroundColor = 'rgba(34, 211, 238, 0.05)';
    };
    input.onblur = () => {
      input.style.borderColor = 'rgba(255,255,255,0.1)';
      input.style.backgroundColor = 'rgba(255,255,255,0.03)';
    };

    const sendBtn = document.createElement('button');
    Object.assign(sendBtn.style, {
      background: '#22D3EE',
      color: '#0B0F17',
      border: 'none',
      borderRadius: '10px',
      width: '42px',
      height: '42px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      transition: 'all 0.2s',
      boxShadow: '0 0 15px rgba(34, 211, 238, 0.3)'
    });
    sendBtn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <line x1="22" y1="2" x2="11" y2="13"></line>
        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
      </svg>
    `;
    sendBtn.onmouseover = () => {
      sendBtn.style.transform = 'scale(1.05)';
      sendBtn.style.boxShadow = '0 0 20px rgba(34, 211, 238, 0.5)';
    };

    inputWrapper.appendChild(input);
    inputWrapper.appendChild(sendBtn);
    inputArea.appendChild(inputWrapper);

    // Branding Footer (hide if showPoweredBy false)
    if (cfg.showPoweredBy !== false) {
      const branding = document.createElement('div');
      Object.assign(branding.style, { textAlign: 'center', marginTop: '4px' });
      branding.innerHTML = `
        <p style="margin:0; font-size: 9px; color: #475569; text-transform: uppercase; letter-spacing: 0.1em;">Powered By</p>
        <p style="margin:2px 0 0; font-size: 11px; color: #64748B; font-weight: 600;">Nvhotech Private Limited</p>
      `;
      inputArea.appendChild(branding);
    }

    chatWindow.appendChild(inputArea);
    document.body.appendChild(chatWindow);
    container.appendChild(button);

    const toggleChat = () => {
      isOpen = !isOpen;
      if (isOpen) {
        backdrop.style.display = 'block';
        setTimeout(() => {
          backdrop.style.opacity = '1';
          chatWindow.style[slideKey] = '0';
        }, 10);
        document.body.style.overflow = 'hidden';
      } else {
        backdrop.style.opacity = '0';
        chatWindow.style[slideKey] = slideHidden;
        setTimeout(() => {
          backdrop.style.display = 'none';
          document.body.style.overflow = '';
        }, 400);
      }
    };

    button.onclick = toggleChat;
    closeBtn.onclick = toggleChat;

    // Entrance Animation for Button (with bounce)
    setTimeout(() => {
      button.style.opacity = '1';
      button.style.transform = 'scale(1)';
      button.style.transition = 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
    }, 500);

    const openChat = () => { if (!isOpen) toggleChat(); };
    return { chatBody, input, sendBtn, openChat };
  };

  // Helper: Neural Message Bubbles
  const escapeHtml = (str) => {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  };

  const addMessage = (target, type, text) => {
    const container = document.createElement('div');
    Object.assign(container.style, {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      animation: 'fadeIn 0.4s ease-out'
    });

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

    if (type === 'user') {
      container.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: baseline;">
          <span style="font-size: 11px; font-weight: 700; color: white; letter-spacing: 0.1em;">USER</span>
          <span style="font-size: 10px; color: #475569;">${timeStr}</span>
        </div>
        <div style="padding: 16px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; color: #94A3B8; font-size: 14px; line-height: 1.6; font-family: 'JetBrains Mono', monospace;">
          ${escapeHtml(text)}
        </div>
      `;
    } else {
      container.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: baseline;">
          <span style="font-size: 11px; font-weight: 700; color: #22D3EE; letter-spacing: 0.1em;">AGENT</span>
          <span style="font-size: 10px; color: #475569;">${timeStr}</span>
        </div>
        <div style="padding: 18px; background: rgba(34, 211, 238, 0.03); border: 1px solid rgba(34, 211, 238, 0.15); border-radius: 12px; color: white; font-size: 14px; line-height: 1.6; box-shadow: 0 4px 20px rgba(0,0,0,0.2);">
          ${escapeHtml(text)}
        </div>
      `;
    }

    target.appendChild(container);
    target.scrollTop = target.scrollHeight;
  };

  /** Creates a bot message container for streaming; returns { container, contentEl, append(text), finish() }. */
  const addStreamingBotMessage = (target) => {
    const outer = document.createElement('div');
    Object.assign(outer.style, {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      animation: 'fadeIn 0.3s ease-out'
    });
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    outer.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: baseline;">
        <span style="font-size: 11px; font-weight: 700; color: #22D3EE; letter-spacing: 0.1em;">AGENT</span>
        <span style="font-size: 10px; color: #475569;">${timeStr}</span>
      </div>
      <div class="neural-stream-content" style="padding: 18px; background: rgba(34, 211, 238, 0.03); border: 1px solid rgba(34, 211, 238, 0.15); border-radius: 12px; color: white; font-size: 14px; line-height: 1.6; box-shadow: 0 4px 20px rgba(0,0,0,0.2); min-height: 24px;"></div>
    `;
    const contentEl = outer.querySelector('.neural-stream-content');
    target.appendChild(outer);
    target.scrollTop = target.scrollHeight;
    return {
      container: outer,
      contentEl,
      append: (text) => {
        contentEl.appendChild(document.createTextNode(text));
        target.scrollTop = target.scrollHeight;
      },
      finish: (finalText) => {
        if (finalText != null) {
          contentEl.textContent = '';
          contentEl.appendChild(document.createTextNode(finalText));
        }
        target.scrollTop = target.scrollHeight;
      }
    };
  };

  // Helper: Neural Typing Indicator
  const addTyping = (target) => {
    const loader = document.createElement('div');
    loader.id = 'chatbot-typing-indicator';
    Object.assign(loader.style, {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      animation: 'fadeIn 0.3s ease-out'
    });

    loader.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: baseline;">
        <span style="font-size: 11px; font-weight: 700; color: #22D3EE; letter-spacing: 0.1em;">PROCESSING</span>
        <span style="font-size: 9px; color: #22D3EE; font-weight: 600;">REAL-TIME</span>
      </div>
      <div style="padding: 14px 18px; background: rgba(34, 211, 238, 0.02); border: 1px dashed rgba(34, 211, 238, 0.3); border-radius: 12px; display: flex; align-items: center; gap: 12px; color: #22D3EE; font-size: 13px;">
        <div class="neural-spin" style="width: 14px; height: 14px; border: 2px solid #22D3EE; border-top-color: transparent; border-radius: 50%;"></div>
        <span>Synchronizing with high-speed nodes...</span>
      </div>
    `;

    // Add spin animation if not exists
    if (!document.getElementById('neural-style')) {
      const style = document.createElement('style');
      style.id = 'neural-style';
      style.innerText = `
        @keyframes neural-spin { to { transform: rotate(360deg); } }
        .neural-spin { animation: neural-spin 0.8s linear infinite; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `;
      document.head.appendChild(style);
    }

    target.appendChild(loader);
    target.scrollTop = target.scrollHeight;
    return loader;
  };


  // 3. Global Language Switcher (Side Drawer Version)
  const createGlobalLanguageSwitcher = () => {
    // 1. Trigger Button
    const container = document.createElement('div');
    container.id = 'global-lang-switcher';
    container.className = 'notranslate';
    Object.assign(container.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      zIndex: '2147483646',
      fontFamily: '"Inter", sans-serif'
    });

    const langBtn = document.createElement('button');
    langBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="2" y1="12" x2="22" y2="12"></line>
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
      </svg>
      <span style="font-weight: 600; font-size: 13px;">Language</span>
    `;
    Object.assign(langBtn.style, {
      backgroundColor: 'white',
      border: '1px solid #E2E8F0',
      borderRadius: '20px',
      padding: '8px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      cursor: 'pointer',
      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
      color: '#1E293B',
      transition: 'all 0.3s ease'
    });

    // 2. Drawer Backdrop
    const backdrop = document.createElement('div');
    Object.assign(backdrop.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0,0,0,0.4)',
      backdropFilter: 'blur(2px)',
      zIndex: '2147483648',
      display: 'none',
      opacity: '0',
      transition: 'opacity 0.3s ease'
    });

    // 3. Side Drawer
    const drawer = document.createElement('div');
    drawer.className = 'notranslate';
    drawer.setAttribute('translate', 'no');
    Object.assign(drawer.style, {
      position: 'fixed',
      top: '0',
      right: '-320px', // Start hidden
      width: '280px',
      height: '100%',
      backgroundColor: '#0B0F17', // Neural Dark
      zIndex: '2147483649',
      boxShadow: '-8px 0 32px rgba(0,0,0,0.5)',
      display: 'flex',
      flexDirection: 'column',
      transition: 'right 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      fontFamily: '"Inter", "JetBrains Mono", monospace'
    });

    // Drawer Header
    const drawerHeader = document.createElement('div');
    Object.assign(drawerHeader.style, {
      padding: '24px',
      background: '#0F172A',
      borderBottom: '1px solid rgba(34, 211, 238, 0.1)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    });
    drawerHeader.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px;">
        <div style="width: 6px; height: 6px; border-radius: 50%; background: #22D3EE; box-shadow: 0 0 10px #22D3EE;"></div>
        <h3 style="margin:0; font-size: 14px; color: white; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em;">Select Language</h3>
      </div>
    `;

    const closeDrawerBtn = document.createElement('button');
    closeDrawerBtn.innerHTML = '✕';
    Object.assign(closeDrawerBtn.style, {
      border: '1px solid rgba(255,255,255,0.1)',
      background: 'rgba(255,255,255,0.05)',
      width: '32px',
      height: '32px',
      borderRadius: '8px',
      cursor: 'pointer',
      color: 'white',
      fontSize: '12px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.2s'
    });
    closeDrawerBtn.onmouseover = () => {
      closeDrawerBtn.style.background = 'rgba(255,255,255,0.1)';
      closeDrawerBtn.style.borderColor = '#22D3EE';
    };
    closeDrawerBtn.onmouseout = () => {
      closeDrawerBtn.style.background = 'rgba(255,255,255,0.05)';
      closeDrawerBtn.style.borderColor = 'rgba(255,255,255,0.1)';
    };

    // Drawer Body (Language List)
    const drawerBody = document.createElement('div');
    drawerBody.id = 'neural-lang-body';
    Object.assign(drawerBody.style, {
      flex: '1',
      overflowY: 'auto',
      padding: '16px',
      backgroundColor: '#0B0F17'
    });

    // Drawer Footer (Branding)
    const drawerFooter = document.createElement('div');
    Object.assign(drawerFooter.style, {
      padding: '20px',
      borderTop: '1px solid rgba(34, 211, 238, 0.1)',
      textAlign: 'center',
      backgroundColor: '#0F172A'
    });
    drawerFooter.innerHTML = `
      <p style="margin:0; font-size: 9px; color: #475569; text-transform: uppercase; letter-spacing: 0.1em;">Powered By</p>
      <p style="margin:2px 0 0; font-size: 11px; color: #64748B; font-weight: 600;">Nvhotech Private Limited</p>
    `;

    const languages = [
      { name: 'English', code: 'en' },
      { name: 'Hindi', code: 'hi' },
      { name: 'Gujarati', code: 'gu' },
      { name: 'Marathi', code: 'mr' },
      { name: 'Bengali', code: 'bn' },
      { name: 'Tamil', code: 'ta' },
      { name: 'Telugu', code: 'te' },
      { name: 'Kannada', code: 'kn' },
      { name: 'Spanish', code: 'es' },
      { name: 'French', code: 'fr' },
      { name: 'Arabic', code: 'ar' },
      { name: 'German', code: 'de' },
      { name: 'Chinese (Simp)', code: 'zh-CN' },
      { name: 'Japanese', code: 'ja' },
      { name: 'Korean', code: 'ko' },
      { name: 'Portuguese', code: 'pt' },
      { name: 'Russian', code: 'ru' },
      { name: 'Italian', code: 'it' },
      { name: 'Turkish', code: 'tr' }
    ];

    languages.forEach(lang => {
      const item = document.createElement('button');
      item.innerHTML = `
        <span>${lang.name}</span>
        <span style="opacity: 0.4; font-size: 12px;">${lang.code.toUpperCase()}</span>
      `;
      Object.assign(item.style, {
        width: '100%',
        padding: '12px 16px',
        border: '1px solid rgba(255,255,255,0.05)',
        background: 'rgba(255,255,255,0.02)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        cursor: 'pointer',
        fontSize: '13px',
        borderRadius: '10px',
        color: '#94A3B8',
        transition: 'all 0.2s',
        marginBottom: '8px',
        fontFamily: 'inherit',
        fontWeight: '500'
      });
      item.onclick = () => {
        changeLanguage(lang.code);
        closeDrawer();
      };
      item.onmouseover = () => {
        item.style.backgroundColor = 'rgba(34, 211, 238, 0.05)';
        item.style.borderColor = 'rgba(34, 211, 238, 0.3)';
        item.style.color = '#22D3EE';
      };
      item.onmouseout = () => {
        item.style.backgroundColor = 'rgba(255,255,255,0.02)';
        item.style.borderColor = 'rgba(255,255,255,0.05)';
        item.style.color = '#94A3B8';
      };
      drawerBody.appendChild(item);
    });

    const openDrawer = () => {
      backdrop.style.display = 'block';
      setTimeout(() => {
        backdrop.style.opacity = '1';
        drawer.style.right = '0';
      }, 10);
      document.body.style.overflow = 'hidden'; // Prevent page scroll
    };

    const closeDrawer = () => {
      backdrop.style.opacity = '0';
      drawer.style.right = '-320px';
      setTimeout(() => {
        backdrop.style.display = 'none';
        document.body.style.overflow = '';
      }, 300);
    };

    langBtn.onclick = openDrawer;
    closeDrawerBtn.onclick = closeDrawer;
    backdrop.onclick = closeDrawer;

    drawerHeader.appendChild(closeDrawerBtn);
    drawer.appendChild(drawerHeader);
    drawer.appendChild(drawerBody);
    drawer.appendChild(drawerFooter);

    container.appendChild(langBtn);
    document.body.appendChild(container);
    document.body.appendChild(backdrop);
    document.body.appendChild(drawer);
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

      const { chatBody, input, sendBtn, openChat } = createChatbotUI(data);
      const autoOpenDelay = data.widgetConfig?.autoOpenDelay;
      if (autoOpenDelay > 0) setTimeout(openChat, autoOpenDelay * 1000);

      // Initialize translation engine
      injectTranslateScript();

      // Initialize Global Language Switcher
      createGlobalLanguageSwitcher();

      if (data.isOffline) {
        // Disable interaction
        input.disabled = true;
        input.placeholder = 'Chatbot is currently offline';
        sendBtn.style.display = 'none';

        setTimeout(() => {
          addMessage(chatBody, 'bot', `Hello! We are currently offline. Please contact our administrator at ${data.email} for assistance.`);
        }, 800);
        return;
      }

      // Request signing: HMAC-SHA256(timestamp + method + path + body, widgetToken) for replay/tamper protection
      const signRequest = async (method, path, bodyString, widgetToken) => {
        const timestamp = String(Date.now());
        const payload = timestamp + '\n' + method + '\n' + path + '\n' + bodyString;
        const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(widgetToken), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
        const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
        const signature = Array.from(new Uint8Array(sig)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
        return { timestamp, signature };
      };

      const getVisitorId = () => {
        const key = 'chatbot_visitor_id';
        try {
          let v = sessionStorage.getItem(key);
          if (!v) {
            v = 'v_' + Math.random().toString(36).slice(2) + '_' + Date.now().toString(36);
            sessionStorage.setItem(key, v);
          }
          return v;
        } catch (e) {
          return 'v_' + Date.now();
        }
      };
      const getConversationId = () => {
        try {
          return sessionStorage.getItem('chatbot_conversation_id') || undefined;
        } catch (e) {
          return undefined;
        }
      };
      const setConversationId = (id) => {
        try {
          if (id) sessionStorage.setItem('chatbot_conversation_id', id);
        } catch (e) {}
      };

      const handleSend = async () => {
        const text = input.value.trim();
        if (!text) return;

        input.value = '';
        addMessage(chatBody, 'user', text);

        const loader = addTyping(chatBody);
        const payload = {
          widgetToken: data.widgetToken,
          message: text,
          visitorId: getVisitorId(),
          conversationId: getConversationId()
        };
        const bodyString = JSON.stringify(payload);
        const pathStream = '/api/chat/stream';
        const { timestamp, signature } = await signRequest('POST', pathStream, bodyString, data.widgetToken);

        try {
          const apiRes = await fetch(`${API_URL}/chat/stream`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Widget-Timestamp': timestamp,
              'X-Widget-Signature': signature
            },
            body: bodyString
          });

          if (!apiRes.ok) {
            const errData = await apiRes.json().catch(() => ({}));
            loader.remove();
            addMessage(chatBody, 'bot', errData.message || 'Something went wrong.');
            return;
          }

          const reader = apiRes.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          let streamStarted = false;
          let streamEl = null;

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed) continue;
              let obj;
              try {
                obj = JSON.parse(trimmed);
              } catch (e) {
                continue;
              }
              if (obj.type === 'conversationId' && obj.conversationId) {
                setConversationId(obj.conversationId);
              }
              if (obj.type === 'token' && obj.content != null) {
                if (!streamStarted) {
                  loader.remove();
                  streamStarted = true;
                  streamEl = addStreamingBotMessage(chatBody);
                }
                streamEl.append(obj.content);
              } else if (obj.type === 'done') {
                if (obj.error) {
                  if (!streamStarted) {
                    loader.remove();
                    addMessage(chatBody, 'bot', obj.error);
                  } else {
                    streamEl.append(' ' + obj.error);
                  }
                }
                if (streamEl) streamEl.finish();
                streamEl = null;
              }
            }
          }
          if (!streamStarted) {
            loader.remove();
            addMessage(chatBody, 'bot', 'No response received. Please try again.');
          } else if (streamEl) {
            streamEl.finish();
          }
        } catch (err) {
          console.error(err);
          loader.remove();
          addMessage(chatBody, 'bot', 'Network error. Please try again.');
        }
      };

      sendBtn.onclick = handleSend;
      input.onkeypress = (e) => { if (e.key === 'Enter') handleSend(); };

      // Welcome Message (custom or default)
      const welcomeText = data.widgetConfig?.welcomeMessage ||
        `Hello! Welcome to ${data.name || 'our support'}. How can I help you today?`;
      setTimeout(() => {
        addMessage(chatBody, 'bot', welcomeText);
      }, 800);

    } catch (e) {
      console.error('Chatbot init failed:', e);
    }
  };

  if (document.readyState === 'complete') init();
  else window.addEventListener('load', init);

})();
