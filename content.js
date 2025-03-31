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
    // Define essential properties first
    const essentialProps = {
      layout: [
        "display",
        "position",
        "width",
        "height",
        "margin",
        "margin-top",
        "margin-right",
        "margin-bottom",
        "margin-left",
        "padding",
        "padding-top",
        "padding-right",
        "padding-bottom",
        "padding-left",
        "top",
        "right",
        "bottom",
        "left",
        "z-index",
        "flex",
        "flex-direction",
        "justify-content",
        "align-items",
      ],
      text: [
        "color",
        "font-family",
        "font-size",
        "font-weight",
        "text-align",
        "line-height",
        "white-space",
      ],
      visual: [
        "background",
        "background-color",
        "background-image",
        "border",
        "border-radius",
        "opacity",
      ],
    };

    function getFullStyles(el) {
      const computed = window.getComputedStyle(el);
      let styles = "";

      // Always include these critical properties
      const criticalProps = new Set([
        "color",
        "background-color",
        "font-family",
        "font-size",
        "font-weight",
        "line-height",
        "text-align",
        "display",
        "position",
        "width",
        "height",
        "margin",
        "padding",
        "border",
        "opacity",
      ]);

      function shouldIncludeProperty(prop, value) {
        if (!value) return false;

        // Always include critical properties
        if (criticalProps.has(prop)) {
          return value !== "initial" && value !== "inherit";
        }

        return (
          value !== "none" &&
          value !== "0px" &&
          value !== "normal" &&
          value !== "auto" &&
          value !== "rgba(0, 0, 0, 0)" &&
          value !== "transparent" &&
          value !== "initial" &&
          value !== ""
        );
      }

      Object.entries(essentialProps).forEach(([category, props]) => {
        props.forEach(prop => {
          // Get both computed and actual style value
          const computedValue = computed.getPropertyValue(prop);
          const inlineValue = el.style.getPropertyValue(prop);

          // Prefer inline styles over computed styles
          const value = inlineValue || computedValue;

          // Skip CSS variables and pseudo-elements
          if (prop.startsWith(":") || prop.includes("--")) {
            return;
          }

          // Always include critical properties with their computed values
          if (criticalProps.has(prop)) {
            if (computedValue && computedValue !== "initial") {
              styles += `    ${prop}: ${computedValue};\n`;
            }
            return;
          }

          // Handle other properties
          if (shouldIncludeProperty(prop, value)) {
            styles += `    ${prop}: ${value};\n`;
          }
        });
      });

      // Add any important inline styles last to ensure they take precedence
      if (el.style.cssText) {
        const inlineStyles = el.style.cssText.split(";");
        inlineStyles.forEach(style => {
          const [prop, value] = style.split(":").map(s => s.trim());
          if (prop && value && prop !== "outline") {
            styles += `    ${prop}: ${value};\n`;
          }
        });
      }

      return styles;
    }

    function generateSelector(el) {
      // Use ID if available
      if (el.id) {
        return `#${el.id}`;
      }

      // Use classes if available
      if (el.classList.length > 0) {
        const classSelector = Array.from(el.classList)
          .filter(cls => !cls.includes("selected-element"))
          .join(".");
        return `.${classSelector}`;
      }

      // Fallback to simple tag name
      return el.tagName.toLowerCase();
    }

    function getContextStyles() {
      let contextCSS = "";
      const rootStyles = window.getComputedStyle(document.documentElement);
      const bodyStyles = window.getComputedStyle(document.body);

      // Check root styles
      const rootBg = rootStyles.backgroundColor;
      const bodyBg = bodyStyles.backgroundColor;

      if (rootBg && rootBg !== "rgba(0, 0, 0, 0)" && rootBg !== "transparent") {
        contextCSS += `:root {\n    background-color: ${rootBg};\n}\n\n`;
      }

      if (bodyBg && bodyBg !== "rgba(0, 0, 0, 0)" && bodyBg !== "transparent") {
        contextCSS += `body {\n    background-color: ${bodyBg};\n}\n\n`;
      }

      return contextCSS;
    }

    function processElement(el, parentSelector = "") {
      if (el.shadowRoot || el.tagName.toLowerCase().includes("-")) {
        return "";
      }

      let css = "";
      const processedSelectors = new Set(); // Track processed selectors

      // Add context styles only for the root element
      if (el === element) {
        css += getContextStyles();
      }

      // Generate selector and get styles
      const selector = generateSelector(el);
      const styles = getFullStyles(el);

      // Only add styles if they exist and haven't been processed
      if (styles.trim() && !processedSelectors.has(selector)) {
        css += `${selector} {\n${styles}}\n\n`;
        processedSelectors.add(selector);
      }

      // Process children recursively
      const processedChildren = new Map(); // Track processed child types

      Array.from(el.children).forEach(child => {
        const childSelector = generateSelector(child);

        // Only process each unique child selector once
        if (!processedChildren.has(childSelector)) {
          processedChildren.set(childSelector, true);
          css += processElement(child);
        }
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

      // Preserve original dimensions
      const originalWidth = element.style.width;
      const originalHeight = element.style.height;

      // Add to cssProperties
      if (originalWidth) cssProperties["width"] = originalWidth;
      if (originalHeight) cssProperties["height"] = originalHeight;

      // Ensure SVG viewBox is preserved
      if (element instanceof SVGElement) {
        const viewBox = element.getAttribute("viewBox");
        if (viewBox) cssProperties["viewBox"] = viewBox;
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
