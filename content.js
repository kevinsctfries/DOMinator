// Initialize only once
if (!window.dominatorInitialized) {
  window.dominatorInitialized = true;

  window.dominator = {
    isEditMode: false,
    activeElement: null,
  };

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
    if (e.target === window.dominator.activeElement) return;
    e.target.style.outline = "2px solid rgba(0, 123, 255, 0.5)"; // Light blue
  }

  function handleMouseOut(e) {
    if (!window.dominator.isEditMode) return;
    if (e.target === document.body) return;
    if (e.target === window.dominator.activeElement) return;
    e.target.style.outline = "";
  }

  function clearHighlights() {
    document.querySelectorAll("*").forEach(el => {
      if (el !== window.dominator.activeElement) {
        el.style.outline = "";
      }
    });
  }

  // CSS extraction and processing
  function getElementCSS(element) {
    function generateSelector(el) {
      let selector = el.tagName.toLowerCase();
      if (el.id) {
        selector += `#${el.id}`;
      } else if (el.className) {
        selector += `.${Array.from(el.classList).join(".")}`;
      }
      return selector;
    }

    function getFullStyles(el) {
      const computed = window.getComputedStyle(el);
      let styles = "";

      // Essential text properties that must be captured
      const textProps = [
        "color",
        "font-family",
        "font-size",
        "font-weight",
        "font-style",
        "text-decoration",
        "text-align",
        "line-height",
        "letter-spacing",
        "word-spacing",
      ];

      // Ensure text properties are captured first
      textProps.forEach(prop => {
        const value = computed.getPropertyValue(prop);
        if (value && value !== "initial") {
          styles += `    ${prop}: ${value} !important;\n`;
        }
      });

      // Get remaining computed styles
      for (const prop of computed) {
        if (!textProps.includes(prop)) {
          const value = computed.getPropertyValue(prop);
          if (value && value !== "initial") {
            styles += `    ${prop}: ${value};\n`;
          }
        }
      }
      return styles;
    }

    function processElement(el, isRoot = true) {
      // Generate specific selector for this element
      const elementSelector = isRoot ? generateSelector(el) : "";
      let css = `${elementSelector} {\n${getFullStyles(el)}}\n\n`;

      // Process children with their own selectors
      Array.from(el.children).forEach(child => {
        const childSelector = generateSelector(child);
        css += processElement(child, false);
      });

      return css;
    }

    return processElement(element);
  }

  function handleClick(e) {
    if (!window.dominator.isEditMode) return;
    e.preventDefault();
    e.stopPropagation();

    try {
      // Clear previous active element
      if (window.dominator.activeElement) {
        window.dominator.activeElement.style.outline = "";
      }

      const element = e.target;

      // Temporarily remove any outline before capturing HTML/CSS
      const originalOutline = element.style.outline;
      element.style.outline = "";

      // Capture raw HTML and CSS while outline is removed
      const rawHtml = element.outerHTML;
      const rawCss = getElementCSS(element);

      // Restore active element highlighting
      window.dominator.activeElement = element;
      element.style.outline = "1px solid rgba(0, 123, 255, 0.7)";

      // Get CSS properties for CSS editor (using the same outline-free state)
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

      // Get the actual background color from highest parent with a background
      let bgColor = "white";
      let parentEl = element;
      const rootBg = window.getComputedStyle(
        document.documentElement
      ).backgroundColor;
      const bodyBg = window.getComputedStyle(document.body).backgroundColor;

      // Check root and body background first
      if (rootBg && rootBg !== "rgba(0, 0, 0, 0)" && rootBg !== "transparent") {
        bgColor = rootBg;
      } else if (
        bodyBg &&
        bodyBg !== "rgba(0, 0, 0, 0)" &&
        bodyBg !== "transparent"
      ) {
        bgColor = bodyBg;
      } else {
        // Walk up the DOM tree to find background color
        while (parentEl) {
          const bg = window.getComputedStyle(parentEl).backgroundColor;
          if (bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") {
            bgColor = bg;
            break;
          }
          parentEl = parentEl.parentElement;
        }
      }

      // Send message with corrected data
      chrome.runtime.sendMessage({
        type: "ELEMENT_SELECTED",
        css: cssProperties,
        rawHtml: rawHtml,
        rawCss: rawCss,
        pageBackground: bgColor,
        baseUrl: window.location.href,
        elementInfo: {
          tagName: element.tagName.toLowerCase(),
          classes: Array.from(element.classList),
          id: element.id,
          hasChildren: element.children.length > 0,
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
    if (message.type === "UPDATE_CSS") {
      try {
        if (window.dominator.activeElement) {
          Object.entries(message.css).forEach(([prop, value]) => {
            window.dominator.activeElement.style.setProperty(prop, value);
          });
          sendResponse({ success: true });
        }
      } catch (error) {
        console.error("Failed to update CSS:", error);
        sendResponse({ success: false, error: error.message });
      }
    }
    return true;
  });

  // Event listeners setup
  document.addEventListener("mouseover", handleMouseOver, true);
  document.addEventListener("mouseout", handleMouseOut, true);
  document.addEventListener("click", handleClick, true);
}
