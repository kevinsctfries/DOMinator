// Initialize only once
if (!window.dominatorInitialized) {
  window.dominatorInitialized = true;

  // Global state management
  window.dominator = { isEditMode: false };

  // Edit mode control functions
  function enableEditMode() {
    window.dominator.isEditMode = true;
    document.body.style.cursor = "crosshair";
  }

  function disableEditMode() {
    window.dominator.isEditMode = false;
    document.body.style.cursor = "default";
    clearHighlights();
  }

  // Element highlighting functions
  function handleMouseOver(e) {
    if (!window.dominator.isEditMode) return;
    if (e.target === document.body) return;
    e.target.style.outline = "2px solid blue";
  }

  function handleMouseOut(e) {
    if (!window.dominator.isEditMode) return;
    if (e.target === document.body) return;
    e.target.style.outline = "";
  }

  function clearHighlights() {
    document.querySelectorAll("*").forEach(el => (el.style.outline = ""));
  }

  // CSS extraction and processing
  function handleClick(e) {
    if (!window.dominator.isEditMode) return;
    e.preventDefault();
    e.stopPropagation();

    try {
      const element = e.target;
      // Temporarily remove highlight to avoid capturing it
      const currentOutline = element.style.outline;
      element.style.outline = "";

      const computedStyles = window.getComputedStyle(element);
      const cssProperties = {};

      // Process inline styles (excluding temporary outline)
      const inlineStyles = element.style;
      for (let i = 0; i < inlineStyles.length; i++) {
        const prop = inlineStyles[i];
        if (prop !== "outline") {
          cssProperties[prop] = inlineStyles[prop];
        }
      }

      // Process stylesheet rules
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
          continue; // Skip inaccessible stylesheets
        }
      }

      // Ensure critical layout properties are included
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

      // Restore highlight
      element.style.outline = currentOutline;

      // Send extracted CSS to popup
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
      disableEditMode();
    }
  }

  // Message handling
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "TOGGLE_EDIT_MODE") {
      message.isActive ? enableEditMode() : disableEditMode();
      sendResponse({ success: true });
    }
    return true;
  });

  // Event listeners setup
  document.addEventListener("mouseover", handleMouseOver, true);
  document.addEventListener("mouseout", handleMouseOut, true);
  document.addEventListener("click", handleClick, true);
}
