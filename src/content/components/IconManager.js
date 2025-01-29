import { getAIResponse } from '../services/apiService';
import PerfectScrollbar from "perfect-scrollbar";
import { setAllowAutoScroll } from "../utils/scrollManager";

export function createIcon(x, y) {
  const icon = document.createElement("img");
  icon.src = chrome.runtime.getURL("icons/icon24.png");
  Object.assign(icon.style, {
    position: "fixed",
    cursor: "pointer",
    left: `${x}px`,
    top: `${y}px`,
    width: "30px",
    height: "30px",
    zIndex: "2147483646",
    padding: "4px",
    backgroundColor: "transparent",
    border: "none",
    outline: "none",
    userSelect: "none",
    pointerEvents: "auto"
  });

  return icon;
}

export function createSvgIcon(text, title) {
  const wrapper = document.createElement("div");
  wrapper.className = "icon-wrapper tooltip";
  wrapper.style.display = "inline-block";

  const icon = document.createElement("img");
  icon.style.width = "15px";
  icon.style.height = "15px";
  icon.src = chrome.runtime.getURL(`icons/${text}.svg`);
  icon.style.border = "none";
  icon.style.cursor = "pointer";
  icon.style.transition = "transform 0.5s ease";

  icon.addEventListener("mousedown", () => {
    icon.src = chrome.runtime.getURL(`icons/${text}Clicked.svg`);
    icon.style.transform = "scale(1.2)";
  });

  icon.addEventListener("mouseup", () => {
    icon.style.transform = "scale(1)";
    icon.src = chrome.runtime.getURL(`icons/${text}.svg`);
  });

  const tooltip = document.createElement("span");
  tooltip.className = "tooltiptext";
  tooltip.textContent = title;
  tooltip.style.visibility = "hidden";
  tooltip.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
  tooltip.style.color = "white";
  tooltip.style.textAlign = "center";
  tooltip.style.padding = "4px 8px";
  tooltip.style.borderRadius = "5px";
  tooltip.style.position = "absolute";
  tooltip.style.zIndex = "1";
  tooltip.style.bottom = "125%";
  tooltip.style.left = "50%";
  tooltip.style.transform = "translateX(-50%)";
  tooltip.style.whiteSpace = "nowrap";

  wrapper.appendChild(icon);
  wrapper.appendChild(tooltip);

  wrapper.addEventListener("mouseenter", () => {
    tooltip.style.visibility = "visible";
  });

  wrapper.addEventListener("mouseleave", () => {
    tooltip.style.visibility = "hidden";
  });

  return wrapper;
}

export function addIconsToElement(element) {
  if (!element.textContent.trim()) {
    return;
  }

  const existingContainer = element.querySelector('.icon-container');
  if (existingContainer) {
    existingContainer.remove();
  }

  const iconContainer = document.createElement("div");
  iconContainer.className = "icon-container";
  iconContainer.style.display = "none";

  const copyWrapper = document.createElement("div");
  copyWrapper.className = "icon-wrapper tooltip";

  const copyIcon = document.createElement("img");
  copyIcon.src = chrome.runtime.getURL("icons/copy.svg");
  copyIcon.title = "Copy";

  const copyTooltip = document.createElement("span");
  copyTooltip.className = "tooltiptext";
  copyTooltip.textContent = "Copy";

  copyWrapper.appendChild(copyIcon);
  copyWrapper.appendChild(copyTooltip);

  copyWrapper.addEventListener("click", (event) => {
    event.stopPropagation();
    const textContent = Array.from(element.childNodes)
      .filter(node => {
        // 排除图标容器和reasoning content
        return (!node.classList ||
                (!node.classList.contains('icon-container') &&
                 !node.classList.contains('reasoning-content')))
      })
      .map(node => node.textContent)
      .join('')
      .trim() // 去除首尾空白字符
      .replace(/^\n+|\n+$/g, ''); // 去除开头和结尾的换行符

    navigator.clipboard.writeText(textContent).then(() => {
      copyIcon.style.transform = "scale(1.2)";
      copyIcon.title = "Copied!";
      copyTooltip.textContent = "Copied!";

      setTimeout(() => {
        copyIcon.style.transform = "";
        copyIcon.title = "Copy";
        copyTooltip.textContent = "Copy";
      }, 1000);
    });
  });

  iconContainer.appendChild(copyWrapper);

  if (element.classList.contains("ai-answer")) {
    const userQuestion = element.previousElementSibling;
    if (userQuestion && userQuestion.classList.contains("user-question")) {
      const regenerateWrapper = document.createElement("div");
      regenerateWrapper.className = "icon-wrapper tooltip";

      const regenerateIcon = document.createElement("img");
      regenerateIcon.src = chrome.runtime.getURL("icons/regenerate.svg");
      regenerateIcon.title = "Regenerate";

      const regenerateTooltip = document.createElement("span");
      regenerateTooltip.className = "tooltiptext";
      regenerateTooltip.textContent = "Regenerate";

      regenerateWrapper.appendChild(regenerateIcon);
      regenerateWrapper.appendChild(regenerateTooltip);

      regenerateWrapper.addEventListener("click", (event) => {
        event.stopPropagation();
        const questionText = userQuestion.textContent;
        element.textContent = "";
        const abortController = new AbortController();
        const aiResponseContainer = window.aiResponseContainer;

        setAllowAutoScroll(true);

        requestAnimationFrame(() => {
          const questionTop = userQuestion.offsetTop;
          aiResponseContainer.scrollTop = Math.max(0, questionTop - 20);
          aiResponseContainer.perfectScrollbar.update();
        });

        getAIResponse(
          questionText,
          element,
          abortController.signal,
          aiResponseContainer.perfectScrollbar,
          null,
          aiResponseContainer,
          true
        );
      });

      iconContainer.appendChild(regenerateWrapper);
    }
  }

  element.style.position = "relative";
  element.appendChild(iconContainer);

  element.addEventListener("mouseenter", () => {
    iconContainer.style.display = "flex";
  });

  element.addEventListener("mouseleave", () => {
    iconContainer.style.display = "none";
  });

  // 添加鼠标移出事件处理
  element.addEventListener('mouseleave', (event) => {
    // 检查是否是首次显示的按钮
    if (iconContainer.dataset.initialShow === 'true') {
      // 移除首次显示标记
      delete iconContainer.dataset.initialShow;
      // 隐藏按钮
      iconContainer.style.display = 'none';

      // 添加常规的悬浮显示逻辑
      element.addEventListener('mouseenter', () => {
        if (!iconContainer.dataset.initialShow) {
          iconContainer.style.display = 'flex';
        }
      });

      element.addEventListener('mouseleave', () => {
        if (!iconContainer.dataset.initialShow) {
          iconContainer.style.display = 'none';
        }
      });
    }
  });

  requestAnimationFrame(() => {
    updateLastAnswerIcons();
  });
}

export function updateLastAnswerIcons() {
  const aiResponseElement = document.getElementById("ai-response");
  if (!aiResponseElement) return;

  const answers = aiResponseElement.getElementsByClassName("ai-answer");
  if (!answers || answers.length === 0) return;

  const aiResponseContainer = document.getElementById("ai-response-container");
  if (!aiResponseContainer) return;

  Array.from(answers).forEach(answer => {
    const iconContainer = answer.querySelector('.icon-container');
    if (iconContainer) {
      const regenerateIcon = iconContainer.querySelector('img[src*="regenerate"]');
      if (regenerateIcon) {
        regenerateIcon.parentElement.remove();
        if (iconContainer.children.length === 0) {
          iconContainer.style.display = 'none';
        }
      }
    }
  });

  const lastAnswer = answers[answers.length - 1];
  if (!lastAnswer) return;

  const userQuestion = lastAnswer.previousElementSibling;
  const iconContainer = lastAnswer.querySelector('.icon-container');

  if (iconContainer && !iconContainer.querySelector('img[src*="regenerate"]') &&
      userQuestion && userQuestion.classList.contains("user-question")) {
    iconContainer.style.display = 'flex';
    const regenerateWrapper = document.createElement("div");
    regenerateWrapper.className = "icon-wrapper tooltip";

    const regenerateIcon = document.createElement("img");
    regenerateIcon.src = chrome.runtime.getURL("icons/regenerate.svg");
    regenerateIcon.title = "Regenerate";

    const regenerateTooltip = document.createElement("span");
    regenerateTooltip.className = "tooltiptext";
    regenerateTooltip.textContent = "Regenerate";

    regenerateWrapper.appendChild(regenerateIcon);
    regenerateWrapper.appendChild(regenerateTooltip);

    regenerateWrapper.addEventListener("click", (event) => {
      event.stopPropagation();
      const questionText = userQuestion.textContent;
      lastAnswer.textContent = "";
      const abortController = new AbortController();
      let ps = aiResponseContainer.ps;
      if (!ps) {
        ps = new PerfectScrollbar(aiResponseContainer, {
          suppressScrollX: true,
          wheelPropagation: false,
        });
        aiResponseContainer.ps = ps;
      }

      requestAnimationFrame(() => {
        const questionTop = userQuestion.offsetTop;
        aiResponseContainer.scrollTop = Math.max(0, questionTop - 20);
        ps.update();
      });

      getAIResponse(
        questionText,
        lastAnswer,
        abortController.signal,
        ps,
        null,
        aiResponseContainer,
        true
      );
    });
    iconContainer.appendChild(regenerateWrapper);
  }
}

window.updateLastAnswerIcons = updateLastAnswerIcons;
window.addIconsToElement = addIconsToElement;