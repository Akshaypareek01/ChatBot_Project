(function () {
  // 1. Dynamic Configuration
  // Derives API URL from the script source (e.g., http://myserver.com/chatbot.js -> http://myserver.com/api)
  const scriptSource = document.currentScript.src;
  const baseUrl = new URL(scriptSource).origin;
  const API_URL = `${baseUrl}/api`;

  const userId = document.currentScript.getAttribute('data-user-id');
  const botSlug = document.currentScript.getAttribute('data-bot-id') || document.currentScript.getAttribute('data-bot');

  if (!userId) {
    console.error('Chatbot Error: No user ID provided');
    return;
  }

  // Phase 3.3: Installation verification — ping so dashboard can show "Widget detected"
  try {
    fetch(`${baseUrl}/api/chatbot/widget-ping`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, origin: window.location.origin }),
      keepalive: true
    }).catch(function () {});
  } catch (_) {}

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
      backgroundColor: 'rgba(15,23,42,0.35)',
      backdropFilter: 'blur(2px)',
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
      backgroundColor: '#ffffff',
      zIndex: '2147483649',
      boxShadow: '0 0 40px rgba(15,23,42,0.18)',
      display: 'flex',
      flexDirection: 'column',
      transition: `${slideKey} 0.4s cubic-bezier(0.4, 0, 0.2, 1)`,
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    });

    // Header (Futuristic Neural Style)
    const header = document.createElement('div');
    Object.assign(header.style, {
      padding: '24px',
      background: '#ffffff',
      borderBottom: '1px solid rgba(15,23,42,0.08)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      position: 'relative'
    });

    const headerTitleContainer = document.createElement('div');
    const avatarUrl = (cfg.botAvatarUrl && cfg.botAvatarUrl.trim()) || '';
    const safeAvatarUrl = avatarUrl ? avatarUrl.replace(/[<>"']/g, '') : '';
    headerTitleContainer.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px;">
        ${safeAvatarUrl
          ? '<img src="' + safeAvatarUrl + '" alt="" style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover; border: 2px solid ' + primaryColor + ';">'
          : '<div style="width: 10px; height: 10px; border-radius: 999px; background: ' + primaryColor + '; box-shadow: 0 0 0 4px rgba(15,23,42,0.04);"></div>'}
        <h3 style="margin:0; font-size: 14px; color: #0F172A; font-weight: 800; letter-spacing: 0.02em;">${brandName}</h3>
      </div>
    `;

    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '✕';
    Object.assign(closeBtn.style, {
      background: 'rgba(15,23,42,0.03)',
      border: '1px solid rgba(15,23,42,0.12)',
      color: '#0F172A',
      borderRadius: '8px',
      padding: '8px 12px',
      cursor: 'pointer',
      fontSize: '14px',
      transition: 'all 0.2s'
    });
    closeBtn.onmouseover = () => {
      closeBtn.style.background = 'rgba(15,23,42,0.06)';
      closeBtn.style.borderColor = primaryColor;
    };
    closeBtn.onmouseout = () => {
      closeBtn.style.background = 'rgba(15,23,42,0.03)';
      closeBtn.style.borderColor = 'rgba(15,23,42,0.12)';
    };

    header.appendChild(headerTitleContainer);
    header.appendChild(closeBtn);
    chatWindow.appendChild(header);

    // Chat Body
    const chatBody = document.createElement('div');
    chatBody.id = 'neural-chat-body';
    chatBody.dataset.primaryColor = primaryColor;
    Object.assign(chatBody.style, {
      flex: '1',
      padding: '24px',
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
      backgroundColor: '#F8FAFC'
    });
    chatWindow.appendChild(chatBody);

    // Input Area
    const inputArea = document.createElement('div');
    Object.assign(inputArea.style, {
      padding: '20px',
      backgroundColor: '#ffffff',
      borderTop: '1px solid rgba(15,23,42,0.08)',
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
    input.placeholder = 'Type Your Query here';
    Object.assign(input.style, {
      flex: '1',
      padding: '12px 16px',
      border: '1px solid #E2E8F0',
      backgroundColor: '#ffffff',
      borderRadius: '12px',
      fontSize: '14px',
      color: '#0F172A',
      outline: 'none',
      fontFamily: 'inherit',
      transition: 'all 0.2s'
    });
    input.onfocus = () => {
      input.style.borderColor = primaryColor;
      input.style.boxShadow = `0 0 0 4px ${primaryColor}1f`;
    };
    input.onblur = () => {
      input.style.borderColor = '#E2E8F0';
      input.style.boxShadow = 'none';
    };

    const sendBtn = document.createElement('button');
    Object.assign(sendBtn.style, {
      background: primaryColor,
      color: '#ffffff',
      border: 'none',
      borderRadius: '10px',
      width: '42px',
      height: '42px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      transition: 'all 0.2s',
      boxShadow: `0 10px 20px ${primaryColor}2b`
    });
    sendBtn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <line x1="22" y1="2" x2="11" y2="13"></line>
        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
      </svg>
    `;
    sendBtn.onmouseover = () => {
      sendBtn.style.transform = 'scale(1.05)';
      sendBtn.style.boxShadow = `0 12px 26px ${primaryColor}3d`;
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
    return { chatBody, input, sendBtn, openChat, inputArea, widgetContainer: container };
  };

  // Helper: Neural Message Bubbles
  const escapeHtml = (str) => {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  };

  const addMessage = (target, type, text) => {
    const themePrimary = (target && target.dataset && target.dataset.primaryColor) || '#2563EB';
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
          <span style="font-size: 11px; font-weight: 700; color: #0F172A; letter-spacing: 0.1em;">YOU</span>
          <span style="font-size: 10px; color: #64748B;">${timeStr}</span>
        </div>
        <div style="padding: 16px; background: ${themePrimary}; border: 1px solid rgba(15,23,42,0.08); border-radius: 12px; color: #ffffff; font-size: 14px; line-height: 1.6;">
          ${escapeHtml(text)}
        </div>
      `;
    } else {
      container.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: baseline;">
          <span style="font-size: 11px; font-weight: 700; color: ${themePrimary}; letter-spacing: 0.1em;">AGENT</span>
          <span style="font-size: 10px; color: #64748B;">${timeStr}</span>
        </div>
        <div style="padding: 18px; background: #ffffff; border: 1px solid rgba(15,23,42,0.10); border-radius: 12px; color: #0F172A; font-size: 14px; line-height: 1.6; box-shadow: 0 10px 30px rgba(15,23,42,0.10);">
          ${escapeHtml(text)}
        </div>
      `;
    }

    target.appendChild(container);
    target.scrollTop = target.scrollHeight;
  };

  /** Creates a bot message container for streaming; returns { container, contentEl, append(text), finish() }. */
  const addStreamingBotMessage = (target) => {
    const themePrimary = (target && target.dataset && target.dataset.primaryColor) || '#2563EB';
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
        <span style="font-size: 11px; font-weight: 700; color: ${themePrimary}; letter-spacing: 0.1em;">AGENT</span>
        <span style="font-size: 10px; color: #64748B;">${timeStr}</span>
      </div>
      <div class="neural-stream-content" style="padding: 18px; background: #ffffff; border: 1px solid rgba(15,23,42,0.10); border-radius: 12px; color: #0F172A; font-size: 14px; line-height: 1.6; box-shadow: 0 10px 30px rgba(15,23,42,0.10); min-height: 24px;"></div>
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
    const themePrimary = (target && target.dataset && target.dataset.primaryColor) || '#2563EB';
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
        <span style="font-size: 11px; font-weight: 700; color: ${themePrimary}; letter-spacing: 0.1em;">PROCESSING</span>
        <span style="font-size: 9px; color: ${themePrimary}; font-weight: 600;">REAL-TIME</span>
      </div>
      <div style="padding: 14px 18px; background: rgba(15,23,42,0.02); border: 1px dashed rgba(15,23,42,0.25); border-radius: 12px; display: flex; align-items: center; gap: 12px; color: ${themePrimary}; font-size: 13px;">
        <div class="neural-spin" style="width: 14px; height: 14px; border: 2px solid ${themePrimary}; border-top-color: transparent; border-radius: 50%;"></div>
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


  // 3. Language switcher: globe FAB stacked above chat button (not page header)
  const createGlobalLanguageSwitcher = (widgetColumn, opts) => {
    if (!widgetColumn) return;
    const isLeft = !!(opts && opts.isLeft);
    const primaryColor = (opts && opts.primaryColor) || '#2563EB';

    const langBtn = document.createElement('button');
    langBtn.type = 'button';
    langBtn.setAttribute('aria-label', 'Choose language');
    langBtn.className = 'notranslate';
    langBtn.id = 'global-lang-trigger';
    langBtn.innerHTML = `
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="2" y1="12" x2="22" y2="12"></line>
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
      </svg>
    `;
    Object.assign(langBtn.style, {
      width: '52px',
      height: '52px',
      borderRadius: '50%',
      backgroundColor: '#ffffff',
      color: primaryColor,
      border: '1px solid rgba(15, 23, 42, 0.12)',
      boxShadow: '0 6px 20px rgba(15, 23, 42, 0.12)',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: '0',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      transform: 'scale(0)',
      opacity: '0',
      fontFamily: '"Inter", sans-serif'
    });
    langBtn.onmouseenter = () => {
      langBtn.style.transform = 'scale(1.08)';
      langBtn.style.boxShadow = '0 8px 24px rgba(15, 23, 42, 0.18)';
    };
    langBtn.onmouseleave = () => {
      langBtn.style.transform = 'scale(1)';
      langBtn.style.boxShadow = '0 6px 20px rgba(15, 23, 42, 0.12)';
    };

    if (widgetColumn && widgetColumn.firstChild) {
      widgetColumn.insertBefore(langBtn, widgetColumn.firstChild);
    } else if (widgetColumn) {
      widgetColumn.appendChild(langBtn);
    }

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

    // 3. Side Drawer (from same edge as widget: left bar for bottom-left, right otherwise)
    const drawer = document.createElement('div');
    drawer.className = 'notranslate';
    drawer.setAttribute('translate', 'no');
    const drawerSlide = isLeft ? 'left' : 'right';
    const drawerHidden = '-320px';
    Object.assign(drawer.style, {
      position: 'fixed',
      top: '0',
      left: isLeft ? drawerHidden : 'auto',
      right: isLeft ? 'auto' : drawerHidden,
      width: '280px',
      height: '100%',
      backgroundColor: '#ffffff',
      zIndex: '2147483649',
      boxShadow: isLeft ? '8px 0 32px rgba(15,23,42,0.18)' : '-8px 0 32px rgba(15,23,42,0.18)',
      display: 'flex',
      flexDirection: 'column',
      transition: `${drawerSlide} 0.3s cubic-bezier(0.4, 0, 0.2, 1)`,
      fontFamily: '"Inter", "JetBrains Mono", monospace'
    });

    // Drawer Header
    const drawerHeader = document.createElement('div');
    Object.assign(drawerHeader.style, {
      padding: '24px',
      background: primaryColor,
      borderBottom: '1px solid rgba(15,23,42,0.08)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    });
    drawerHeader.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px;">
        <div style="width: 8px; height: 8px; border-radius: 999px; background: rgba(255,255,255,0.9); box-shadow: 0 0 0 4px rgba(255,255,255,0.15);"></div>
        <h3 style="margin:0; font-size: 14px; color: #ffffff; font-weight: 800; letter-spacing: 0.04em;">Select Language</h3>
      </div>
    `;

    const closeDrawerBtn = document.createElement('button');
    closeDrawerBtn.innerHTML = '✕';
    Object.assign(closeDrawerBtn.style, {
      border: '1px solid rgba(255,255,255,0.25)',
      background: 'rgba(255,255,255,0.12)',
      width: '32px',
      height: '32px',
      borderRadius: '8px',
      cursor: 'pointer',
      color: '#ffffff',
      fontSize: '12px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.2s'
    });
    closeDrawerBtn.onmouseover = () => {
      closeDrawerBtn.style.background = 'rgba(255,255,255,0.18)';
      closeDrawerBtn.style.borderColor = 'rgba(255,255,255,0.45)';
    };
    closeDrawerBtn.onmouseout = () => {
      closeDrawerBtn.style.background = 'rgba(255,255,255,0.12)';
      closeDrawerBtn.style.borderColor = 'rgba(255,255,255,0.25)';
    };

    // Drawer Body (Language List)
    const drawerBody = document.createElement('div');
    drawerBody.id = 'neural-lang-body';
    Object.assign(drawerBody.style, {
      flex: '1',
      overflowY: 'auto',
      padding: '16px',
      backgroundColor: '#ffffff'
    });

    // Drawer Footer (Branding)
    const drawerFooter = document.createElement('div');
    Object.assign(drawerFooter.style, {
      padding: '20px',
      borderTop: '1px solid rgba(15,23,42,0.08)',
      textAlign: 'center',
      backgroundColor: '#ffffff'
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
      border: '1px solid rgba(15,23,42,0.10)',
      background: '#ffffff',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        cursor: 'pointer',
        fontSize: '13px',
        borderRadius: '10px',
      color: '#0F172A',
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
      item.style.backgroundColor = primaryColor + '0f';
      item.style.borderColor = primaryColor + '55';
      item.style.color = primaryColor;
      };
      item.onmouseout = () => {
      item.style.backgroundColor = '#ffffff';
      item.style.borderColor = 'rgba(15,23,42,0.10)';
      item.style.color = '#0F172A';
      };
      drawerBody.appendChild(item);
    });

    const openDrawer = () => {
      backdrop.style.display = 'block';
      setTimeout(() => {
        backdrop.style.opacity = '1';
        if (isLeft) {
          drawer.style.left = '0';
        } else {
          drawer.style.right = '0';
        }
      }, 10);
      document.body.style.overflow = 'hidden';
    };

    const closeDrawer = () => {
      backdrop.style.opacity = '0';
      if (isLeft) {
        drawer.style.left = drawerHidden;
      } else {
        drawer.style.right = drawerHidden;
      }
      setTimeout(() => {
        backdrop.style.display = 'none';
        document.body.style.overflow = '';
      }, 300);
    };

    langBtn.onclick = (e) => {
      e.stopPropagation();
      openDrawer();
    };
    closeDrawerBtn.onclick = closeDrawer;
    backdrop.onclick = closeDrawer;

    drawerHeader.appendChild(closeDrawerBtn);
    drawer.appendChild(drawerHeader);
    drawer.appendChild(drawerBody);
    drawer.appendChild(drawerFooter);

    document.body.appendChild(backdrop);
    document.body.appendChild(drawer);

    setTimeout(() => {
      langBtn.style.opacity = '1';
      langBtn.style.transform = 'scale(1)';
      langBtn.style.transition = 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
    }, 350);
  };

  // Logic: Initialize
  const init = async () => {
    try {
      // Fetch Brand Info / Status
      const botQuery = botSlug ? '?bot=' + encodeURIComponent(botSlug) : '';
      const res = await fetch(`${API_URL}/chatbot/${userId}${botQuery}`);
      const data = await res.json();

      if (!res.ok) {
        console.warn(`Chatbot: ${data.message || 'Unavailable'}`);
        return;
      }

      const { chatBody, input, sendBtn, openChat, inputArea, widgetContainer } = createChatbotUI(data);
      const autoOpenDelay = data.widgetConfig?.autoOpenDelay;
      if (autoOpenDelay > 0) setTimeout(openChat, autoOpenDelay * 1000);

      if (data.widgetConfig && data.widgetConfig.customCss && typeof data.widgetConfig.customCss === 'string') {
        var customStyle = document.createElement('style');
        customStyle.id = 'chatbot-custom-css';
        customStyle.textContent = data.widgetConfig.customCss.trim();
        document.head.appendChild(customStyle);
      }

      // Initialize translation engine
      injectTranslateScript();

      const wc = data.widgetConfig || {};
      createGlobalLanguageSwitcher(widgetContainer, {
        isLeft: wc.position === 'bottom-left',
        primaryColor: wc.primaryColor || '#2563EB'
      });

      if (data.isOffline) {
        input.disabled = true;
        sendBtn.style.display = 'none';
        if (data.upgradeRequired) {
          input.placeholder = 'Monthly limit reached';
          setTimeout(function () {
            addMessage(chatBody, 'bot', 'The chat limit for this month has been reached. Please ask the site owner to upgrade their plan to continue.');
          }, 800);
        } else {
          input.placeholder = 'Chatbot is currently offline';
          setTimeout(function () {
            addMessage(chatBody, 'bot', 'Hello! We are currently offline. Please contact our administrator at ' + (data.email || '') + ' for assistance.');
          }, 800);
        }
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

      var lastSentMessage = null;
      var inHandoffMode = false;
      var handoffSocket = null;

      const handleSend = async (optionalText) => {
        const isDomEvent =
          optionalText &&
          typeof optionalText === 'object' &&
          (typeof optionalText.preventDefault === 'function' ||
            typeof optionalText.stopPropagation === 'function' ||
            (typeof Event !== 'undefined' && optionalText instanceof Event));

        const text = (!isDomEvent && optionalText != null ? String(optionalText).trim() : input.value.trim());
        if (!text) return;
        input.value = '';

        if (inHandoffMode && handoffSocket) {
          handoffSocket.emit('handoff_message', { conversationId: getConversationId(), content: text, role: 'visitor' }, function () {});
          addMessage(chatBody, 'user', text);
          chatBody.scrollTop = chatBody.scrollHeight;
          return;
        }

        addMessage(chatBody, 'user', text);
        lastSentMessage = text;

        const loader = addTyping(chatBody);
        const payload = {
          widgetToken: data.widgetToken,
          message: text,
          visitorId: getVisitorId(),
          conversationId: getConversationId()
        };
        if (botSlug) payload.botId = botSlug;
        const bodyString = JSON.stringify(payload);
        const pathStream = '/api/chat/stream';
        const { timestamp, signature } = await signRequest('POST', pathStream, bodyString, data.widgetToken);

        var controller = new AbortController();

        try {
          const apiRes = await fetch(`${API_URL}/chat/stream`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Widget-Timestamp': timestamp,
              'X-Widget-Signature': signature
            },
            body: bodyString,
            signal: controller.signal
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
          let lowConfidenceFlag = false;

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
              if (obj.type === 'confidence' && obj.low === true && !streamStarted && streamEl == null) {
                lowConfidenceFlag = true;
              }
              if (obj.type === 'messageIndex' && typeof obj.messageIndex === 'number' && streamEl) {
                var cid = getConversationId();
                if (cid) {
                  var thumbsWrap = document.createElement('div');
                  thumbsWrap.style.cssText = 'display:flex;gap:8px;margin-top:8px;';
                  var up = document.createElement('button');
                  up.title = 'Good response';
                  up.innerHTML = '&#128077;';
                  up.style.cssText = 'background:none;border:none;cursor:pointer;font-size:16px;opacity:0.7;';
                  var down = document.createElement('button');
                  down.title = 'Bad response';
                  down.innerHTML = '&#128078;';
                  down.style.cssText = 'background:none;border:none;cursor:pointer;font-size:16px;opacity:0.7;';
                  var sendFeedback = function (val) {
                    up.disabled = down.disabled = true;
                    var bodyString = JSON.stringify({ widgetToken: data.widgetToken, conversationId: cid, messageIndex: obj.messageIndex, feedback: val });
                    signRequest('POST', '/api/chat/feedback', bodyString, data.widgetToken).then(function (sig) {
                      fetch(API_URL + '/chat/feedback', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'X-Widget-Timestamp': sig.timestamp, 'X-Widget-Signature': sig.signature },
                        body: bodyString
                      }).catch(function () {});
                    });
                  };
                  up.onclick = function () { sendFeedback(1); };
                  down.onclick = function () { sendFeedback(-1); };
                  thumbsWrap.appendChild(up);
                  thumbsWrap.appendChild(down);
                  streamEl.container.appendChild(thumbsWrap);
                }
                streamEl = null;
              }
              if (obj.type === 'buttons' && Array.isArray(obj.buttons) && obj.buttons.length && streamEl) {
                var wrap = document.createElement('div');
                wrap.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;margin-top:10px;';
                var themePrimary = (chatBody && chatBody.dataset && chatBody.dataset.primaryColor) || '#2563EB';
                obj.buttons.slice(0, 8).forEach(function (b) {
                  var btn = document.createElement('button');
                  btn.textContent = b.label;
                  btn.style.cssText = 'padding:6px 10px;border-radius:999px;border:1px solid ' + themePrimary + '55;background:' + themePrimary + '12;color:' + themePrimary + ';cursor:pointer;font-size:12px;';
                  btn.onclick = function () {
                    input.value = b.label;
                    sendBtn.click();
                  };
                  wrap.appendChild(btn);
                });
                streamEl.container.appendChild(wrap);
              }
              if (obj.type === 'token' && obj.content != null) {
                if (!streamStarted) {
                  loader.remove();
                  streamStarted = true;
                  streamEl = addStreamingBotMessage(chatBody);
                  if (lowConfidenceFlag) {
                    streamEl.append("I'm not sure about this. ");
                    lowConfidenceFlag = false;
                  }
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
                var sug = data.widgetConfig?.suggestedQuestions;
                if (Array.isArray(sug) && sug.length > 0) {
                  var qWrap = document.createElement('div');
                  qWrap.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;margin-top:12px;';
                  sug.slice(0, 5).forEach(function (q) {
                    if (!q || typeof q !== 'string') return;
                    var qBtn = document.createElement('button');
                    qBtn.textContent = q;
                    var themePrimary = (chatBody && chatBody.dataset && chatBody.dataset.primaryColor) || '#2563EB';
                    qBtn.style.cssText = 'padding:8px 14px;border:1px solid ' + themePrimary + '55;background:' + themePrimary + '12;color:' + themePrimary + ';border-radius:8px;font-size:13px;cursor:pointer;';
                    qBtn.onclick = function () { handleSend(q); qWrap.remove(); };
                    qWrap.appendChild(qBtn);
                  });
                  chatBody.appendChild(qWrap);
                  chatBody.scrollTop = chatBody.scrollHeight;
                }
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
          if (err.name === 'AbortError') {
            var retryWrap = document.createElement('div');
            retryWrap.style.cssText = 'margin-top:8px;';
            retryWrap.innerHTML = '<span style="color:#64748B;font-size:13px;">Connection interrupted. </span>';
            var retryBtn = document.createElement('button');
            retryBtn.textContent = 'Retry';
            var themePrimary = (chatBody && chatBody.dataset && chatBody.dataset.primaryColor) || '#2563EB';
            retryBtn.style.cssText = 'background:' + themePrimary + '12;color:' + themePrimary + ';border:1px solid ' + themePrimary + '55;padding:6px 12px;border-radius:8px;cursor:pointer;font-size:13px;margin-left:8px;';
            retryBtn.onclick = function () {
              retryWrap.remove();
              if (lastSentMessage) handleSend(lastSentMessage);
            };
            retryWrap.appendChild(retryBtn);
            chatBody.appendChild(retryWrap);
            chatBody.scrollTop = chatBody.scrollHeight;
          } else {
            var errWrap = document.createElement('div');
            errWrap.innerHTML = '<span style="color:#64748B;">Network error. </span>';
            var againBtn = document.createElement('button');
            againBtn.textContent = 'Retry';
            var themePrimary = (chatBody && chatBody.dataset && chatBody.dataset.primaryColor) || '#2563EB';
            againBtn.style.cssText = 'background:' + themePrimary + '12;color:' + themePrimary + ';border:1px solid ' + themePrimary + '55;padding:6px 12px;border-radius:8px;cursor:pointer;font-size:13px;margin-left:8px;';
            againBtn.onclick = function () {
              errWrap.remove();
              if (lastSentMessage) handleSend(lastSentMessage);
            };
            errWrap.appendChild(againBtn);
            chatBody.appendChild(errWrap);
            chatBody.scrollTop = chatBody.scrollHeight;
          }
        }
      };

      sendBtn.onclick = function () { handleSend(); };
      input.onkeypress = (e) => { if (e.key === 'Enter') handleSend(); };

      const welcomeText = data.widgetConfig?.welcomeMessage ||
        `Hello! Welcome to ${data.name || 'our support'}. How can I help you today?`;
      const preChat = data.widgetConfig?.preChatForm;
      const needPreChat = preChat && preChat.enabled && preChat.fields && preChat.fields.length && !getConversationId();

      if (needPreChat) {
        const formWrap = document.createElement('div');
        formWrap.id = 'chatbot-preachat-form';
        formWrap.style.cssText = 'padding: 16px;';
        const msg = (preChat.welcomeMessage || 'Please share your details to start.').trim();
        formWrap.innerHTML = '<p style="color:#64748B;font-size:14px;margin-bottom:16px;">' + escapeHtml(msg) + '</p>';
        const form = document.createElement('form');
        form.style.cssText = 'display:flex;flex-direction:column;gap:12px;';
        preChat.fields.forEach(function (f) {
          const key = f.key || 'name';
          const lab = document.createElement('label');
          lab.textContent = f.label || key.charAt(0).toUpperCase() + key.slice(1);
          lab.style.cssText = 'color:#475569;font-size:12px;';
          const inp = document.createElement('input');
          inp.name = key;
          inp.type = key === 'email' ? 'email' : key === 'phone' ? 'tel' : 'text';
          inp.placeholder = key === 'email' ? 'you@example.com' : key === 'phone' ? 'Phone' : 'Name';
          inp.required = !!f.required;
          var themePrimary = (chatBody && chatBody.dataset && chatBody.dataset.primaryColor) || '#2563EB';
          inp.style.cssText = 'padding:10px 12px;border:1px solid #E2E8F0;background:#ffffff;border-radius:8px;color:#0F172A;font-size:14px;outline:none;';
          inp.onfocus = function () { inp.style.borderColor = themePrimary; inp.style.boxShadow = '0 0 0 4px ' + themePrimary + '1f'; };
          inp.onblur = function () { inp.style.borderColor = '#E2E8F0'; inp.style.boxShadow = 'none'; };
          form.appendChild(lab);
          form.appendChild(inp);
        });
        const subBtn = document.createElement('button');
        subBtn.type = 'submit';
        subBtn.textContent = 'Start chat';
        var themePrimary = (chatBody && chatBody.dataset && chatBody.dataset.primaryColor) || '#2563EB';
        subBtn.style.cssText = 'padding:10px 16px;background:' + themePrimary + ';color:#ffffff;border:none;border-radius:8px;cursor:pointer;font-weight:700;';
        form.appendChild(subBtn);
        formWrap.appendChild(form);
        chatBody.appendChild(formWrap);
        form.onsubmit = async function (e) {
          e.preventDefault();
          const leadInfo = {};
          preChat.fields.forEach(function (f) {
            const key = f.key || 'name';
            const val = (form.querySelector('[name="' + key + '"]') || {}).value;
            if (val) leadInfo[key] = val;
          });
          const body = { widgetToken: data.widgetToken, visitorId: getVisitorId(), leadInfo: leadInfo };
            if (botSlug) body.botId = botSlug;
            const bodyString = JSON.stringify(body);
          const path = '/api/chat/start';
          const { timestamp, signature } = await signRequest('POST', path, bodyString, data.widgetToken);
          try {
            const res = await fetch(API_URL + '/chat/start', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'X-Widget-Timestamp': timestamp, 'X-Widget-Signature': signature },
              body: bodyString
            });
            const json = await res.json();
            if (res.ok && json.conversationId) {
              setConversationId(json.conversationId);
              formWrap.remove();
              addMessage(chatBody, 'bot', welcomeText);
              var sug = data.widgetConfig?.suggestedQuestions;
              if (Array.isArray(sug) && sug.length > 0) {
                var w = document.createElement('div');
                w.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;margin-top:12px;';
                sug.slice(0, 5).forEach(function (q) {
                  if (!q || typeof q !== 'string') return;
                  var b = document.createElement('button');
                  b.textContent = q;
                  b.style.cssText = 'padding:8px 14px;border:1px solid rgba(34,211,238,0.3);background:rgba(34,211,238,0.08);color:#22D3EE;border-radius:8px;font-size:13px;cursor:pointer;';
                  b.onclick = function () { handleSend(q); w.remove(); };
                  w.appendChild(b);
                });
                chatBody.appendChild(w);
              }
            } else {
              addMessage(chatBody, 'bot', json.message || 'Could not start chat.');
            }
          } catch (err) {
            addMessage(chatBody, 'bot', 'Network error. Please try again.');
          }
        };
      } else {
        setTimeout(function () {
          addMessage(chatBody, 'bot', welcomeText);
          var suggested = data.widgetConfig?.suggestedQuestions;
          if (Array.isArray(suggested) && suggested.length > 0) {
            var wrap = document.createElement('div');
            wrap.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;margin-top:12px;';
            suggested.slice(0, 5).forEach(function (q) {
              if (!q || typeof q !== 'string') return;
              var btn = document.createElement('button');
              btn.textContent = q;
              btn.style.cssText = 'padding:8px 14px;border:1px solid rgba(34,211,238,0.3);background:rgba(34,211,238,0.08);color:#22D3EE;border-radius:8px;font-size:13px;cursor:pointer;';
              btn.onclick = function () { handleSend(q); wrap.remove(); };
              wrap.appendChild(btn);
            });
            chatBody.appendChild(wrap);
          }
        }, 800);
      }

      // Phase 5.1: Talk to Human button
      var humanWrap = document.createElement('div');
      humanWrap.style.cssText = 'padding:6px 12px;text-align:center;border-top:1px solid rgba(255,255,255,0.06);';
      var humanBtn = document.createElement('button');
      humanBtn.textContent = 'Talk to Human';
      humanBtn.style.cssText = 'background:transparent;border:1px solid rgba(34,211,238,0.4);color:#22D3EE;padding:6px 12px;border-radius:8px;cursor:pointer;font-size:12px;';
      humanBtn.onclick = async function () {
        var cid = getConversationId();
        if (!cid) {
          addMessage(chatBody, 'bot', 'Please send a message first to start the conversation.');
          return;
        }
        humanBtn.disabled = true;
        var body = { widgetToken: data.widgetToken, conversationId: cid };
        var bodyString = JSON.stringify(body);
        var path = '/api/chat/escalate';
        var sig = await signRequest('POST', path, bodyString, data.widgetToken);
        try {
          var escRes = await fetch(API_URL + '/chat/escalate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Widget-Timestamp': sig.timestamp, 'X-Widget-Signature': sig.signature },
            body: bodyString
          });
          var escJson = await escRes.json();
          if (!escRes.ok) {
            addMessage(chatBody, 'bot', escJson.message || 'Could not connect.');
            humanBtn.disabled = false;
            return;
          }
          addMessage(chatBody, 'bot', 'Connecting you to an agent...');
          chatBody.scrollTop = chatBody.scrollHeight;
          if (typeof io === 'undefined') {
            await new Promise(function (resolve, reject) {
              var sc = document.createElement('script');
              sc.src = baseUrl + '/socket.io/socket.io.js';
              sc.onload = resolve;
              sc.onerror = reject;
              document.head.appendChild(sc);
            });
          }
          handoffSocket = io(baseUrl, { path: '/socket.io', auth: { widgetToken: data.widgetToken, conversationId: cid } });
          handoffSocket.on('agent_joined', function () {
            inHandoffMode = true;
            addMessage(chatBody, 'bot', 'An agent has joined. You can chat below.');
            chatBody.scrollTop = chatBody.scrollHeight;
          });
          handoffSocket.on('handoff_message', function (p) {
            if (p.role === 'agent') {
              addMessage(chatBody, 'bot', p.content);
              chatBody.scrollTop = chatBody.scrollHeight;
            }
          });
          handoffSocket.on('agent_left', function () {
            inHandoffMode = false;
            addMessage(chatBody, 'bot', 'Agent left. You can continue with the chatbot.');
            chatBody.scrollTop = chatBody.scrollHeight;
          });
        } catch (err) {
          addMessage(chatBody, 'bot', 'Connection error. Please try again.');
        }
        humanBtn.disabled = false;
      };
      humanWrap.appendChild(humanBtn);
      inputArea.insertBefore(humanWrap, inputArea.firstChild);

    } catch (e) {
      console.error('Chatbot init failed:', e);
    }
  };

  if (document.readyState === 'complete') init();
  else window.addEventListener('load', init);

})();
