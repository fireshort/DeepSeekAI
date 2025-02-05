// 在文件开头添加调试日志

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getSettings") {
    chrome.storage.sync.get(
      ["deepseekApiKey", "volcengineApiKey", "language", "model", "provider", "v3model", "r1model"],
      (data) => {
        sendResponse({
          deepseekApiKey: data.deepseekApiKey || '',
          volcengineApiKey: data.volcengineApiKey || '',
          language: data.language || 'en',
          model: data.model || 'v3',
          provider: data.provider || 'deepseek',
          v3model: data.v3model || '',
          r1model: data.r1model || ''
        });
      }
    );
    return true;
  }

  if (request.action === "proxyRequest") {
    const controller = new AbortController();
    const signal = controller.signal;

    fetch(request.url, {
      method: request.method,
      headers: request.headers,
      body: request.body,
      signal
    })
    .then(async response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            chrome.tabs.sendMessage(sender.tab.id, {
              type: "streamResponse",
              response: { data: 'data: [DONE]\n\n', ok: true, done: true }
            });
            break;
          }

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.trim() === '') continue;
            if (!line.startsWith('data: ')) continue;

            const data = line.slice(6);
            if (data === '[DONE]') {
              chrome.tabs.sendMessage(sender.tab.id, {
                type: "streamResponse",
                response: { data: 'data: [DONE]\n\n', ok: true, done: true }
              });
              break;
            }

            chrome.tabs.sendMessage(sender.tab.id, {
              type: "streamResponse",
              response: { data: line + '\n\n', ok: true, done: false }
            });
          }
        }
      } catch (error) {
        chrome.tabs.sendMessage(sender.tab.id, {
          type: "streamResponse",
          response: { ok: false, error: error.message }
        });
      } finally {
        reader.releaseLock();
      }
    })
    .catch(error => {
      chrome.tabs.sendMessage(sender.tab.id, {
        type: "streamResponse",
        response: { ok: false, error: error.message }
      });
    });

    return true;
  }

  if (request.action === "openPopup") {
    chrome.action.openPopup();
    return true;
  }
});

// Create context menu on extension installation
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "createPopup",
    title: "DeepSeek AI",
    contexts: ["selection"],
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "createPopup") {
    chrome.tabs.sendMessage(tab.id, {
      action: "createPopup",
      selectedText: info.selectionText || null,
      message: info.selectionText || getGreeting()
    });
  }
});

// 全局注册命令监听器
chrome.commands.onCommand.addListener(async (command) => {
  if (command === "toggle-chat") {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || tab.url.startsWith('chrome://') || tab.url.startsWith('edge://')) {
      return;
    }

    // 获取选中的文本
    try {
      const [{result}] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => window.getSelection().toString()
      });

      chrome.tabs.sendMessage(tab.id, {
        action: "toggleChat",
        selectedText: result || null,
        message: result || getGreeting()
      });
    } catch (error) {
      chrome.tabs.sendMessage(tab.id, {
        action: "toggleChat",
        selectedText: null,
        message: getGreeting()
      });
    }
  } else if (command === "close-chat") {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || tab.url.startsWith('chrome://') || tab.url.startsWith('edge://')) {
      return;
    }

    chrome.tabs.sendMessage(tab.id, {
      action: "closeChat"
    });
  }
});

function getGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) {
    return "Good morning 👋";
  } else if (hour >= 12 && hour < 18) {
    return "Good afternoon 👋";
  } else {
    return "Good evening 👋";
  }
}

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === chrome.runtime.OnInstalledReason.INSTALL) {
    // 打开说明页面
    chrome.tabs.create({
      url: chrome.runtime.getURL('Instructions/Instructions.html')
    });
  }
});

