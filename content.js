let isEditMode = false;

function enableEditMode() {
  isEditMode = true;
  document.body.style.cursor = "crosshair";
  document.addEventListener("mouseover", handleMouseOver);
  document.addEventListener("mouseout", handleMouseOut);
  document.addEventListener("click", handleClick, true);
}

function disableEditMode() {
  isEditMode = false;
  document.body.style.cursor = "default";
  document.removeEventListener("mouseover", handleMouseOver);
  document.removeEventListener("mouseout", handleMouseOut);
  document.removeEventListener("click", handleClick, true);
  clearHighlights();
}

function handleMouseOver(e) {
  if (!isEditMode) return;
  e.stopPropagation();
  e.target.style.outline = "2px solid #007bff";
}

function handleMouseOut(e) {
  if (!isEditMode) return;
  e.stopPropagation();
  e.target.style.outline = "";
}

function handleClick(e) {
  if (!isEditMode) return;
  e.preventDefault();
  e.stopPropagation();

  try {
    const element = e.target;
    const computedStyles = window.getComputedStyle(element);
    const cssProperties = {};

    // Get inline styles
    const inlineStyles = element.style;
    for (let i = 0; i < inlineStyles.length; i++) {
      const prop = inlineStyles[i];
      cssProperties[prop] = inlineStyles[prop];
    }

    // Get styles from applied stylesheets
    const sheets = document.styleSheets;
    for (let i = 0; i < sheets.length; i++) {
      try {
        const rules = sheets[i].cssRules || sheets[i].rules;
        for (let j = 0; j < rules.length; j++) {
          const rule = rules[j];
          if (element.matches(rule.selectorText)) {
            const ruleStyle = rule.style;
            for (let k = 0; k < ruleStyle.length; k++) {
              const prop = ruleStyle[k];
              cssProperties[prop] = computedStyles.getPropertyValue(prop);
            }
          }
        }
      } catch (e) {
        // Skip cross-origin stylesheets
        continue;
      }
    }

    // Add important layout properties even if inherited
    const criticalProps = [
      "display",
      "position",
      "width",
      "height",
      "margin",
      "padding",
    ];
    criticalProps.forEach(prop => {
      if (!cssProperties[prop]) {
        const value = computedStyles.getPropertyValue(prop);
        if (value && value !== "none" && value !== "0px") {
          cssProperties[prop] = value;
        }
      }
    });

    chrome.runtime.sendMessage({
      type: "ELEMENT_SELECTED",
      css: cssProperties,
      elementInfo: {
        tagName: element.tagName.toLowerCase(),
        classes: Array.from(element.classList),
        id: element.id,
      },
    });
  } catch (error) {
    console.error("Click handler error:", error);
    disableEditMode();
  }
}

function clearHighlights() {
  document.querySelectorAll("*").forEach(el => (el.style.outline = ""));
}

// Listen for messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "EDIT_MODE_CHANGED") {
    if (message.isActive) {
      enableEditMode();
    } else {
      disableEditMode();
    }
    sendResponse({ success: true });
  }
  return true;
});

// Initialize immediately
enableEditMode();

// Handle page unload
window.addEventListener("unload", () => disableEditMode());
