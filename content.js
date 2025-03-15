// Only initialize if not already loaded
if (!window.dominatorInitialized) {
  window.dominatorInitialized = true;
  console.log("Content script starting...");

  window.dominator = {
    isEditMode: false,
  };

  function enableEditMode() {
    console.log("Enabling edit mode");
    window.dominator.isEditMode = true;
    document.body.style.cursor = "crosshair";
  }

  function disableEditMode() {
    console.log("Disabling edit mode");
    window.dominator.isEditMode = false;
    document.body.style.cursor = "default";
    clearHighlights();
  }

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

  function handleClick(e) {
    if (!window.dominator.isEditMode) return;
    e.preventDefault();
    e.stopPropagation();

    try {
      const element = e.target;
      // Remove highlight before getting styles
      const currentOutline = element.style.outline;
      element.style.outline = "";

      const computedStyles = window.getComputedStyle(element);
      const cssProperties = {};

      // Get inline styles (excluding our temporary outline)
      const inlineStyles = element.style;
      for (let i = 0; i < inlineStyles.length; i++) {
        const prop = inlineStyles[i];
        if (prop !== "outline") {
          // Skip our temporary outline
          cssProperties[prop] = inlineStyles[prop];
        }
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

      // Restore highlight after getting styles
      element.style.outline = currentOutline;

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

  // Set up message listener
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Received message:", message);

    if (message.type === "TOGGLE_EDIT_MODE") {
      if (message.isActive) {
        enableEditMode();
      } else {
        disableEditMode();
      }
      sendResponse({ success: true });
    }
    return true;
  });

  // Add event listeners
  document.addEventListener("mouseover", handleMouseOver, true);
  document.addEventListener("mouseout", handleMouseOut, true);
  document.addEventListener("click", handleClick, true);

  console.log("Content script ready!");
}
