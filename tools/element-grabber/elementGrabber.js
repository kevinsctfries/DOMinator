document.addEventListener("DOMContentLoaded", () => {
  // Go back
  document.getElementById("backToHome").addEventListener("click", () => {
    window.location.href = "../../popup.html";
  });

  const editModeButton = document.getElementById("grabElement");
  let isEditModeActive = false;

  let activeTabId = null;

  editModeButton.addEventListener("click", async () => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: "GET_ORIGINAL_TAB",
      });
      if (!response?.tabId) {
        throw new Error("Could not find original tab");
      }

      const tabId = response.tabId;
      activeTabId = response.tabId;

      await chrome.scripting.executeScript({
        target: { tabId },
        files: ["content.js"],
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      isEditModeActive = !isEditModeActive;
      updateButtonState(isEditModeActive);

      await chrome.tabs.sendMessage(tabId, {
        type: "TOGGLE_EDIT_MODE",
        isActive: isEditModeActive,
      });
    } catch (error) {
      isEditModeActive = !isEditModeActive;
      updateButtonState(isEditModeActive);
    }
  });

  function updateButtonState(active) {
    editModeButton.textContent = active
      ? "Enable Element Grabber"
      : "Disable Element Grabber";
    editModeButton.className = active ? "active" : "";
  }

  // Update display system
  chrome.runtime.onMessage.addListener(message => {
    if (message.type === "ELEMENT_SELECTED") {
      const htmlOutput = document.getElementById("htmlOutput");
      const cssOutput = document.getElementById("cssOutput");
      const previewContainer = document.getElementById("elementPreview");

      // Format and display HTML/CSS with syntax highlighting
      const formattedHtml = message.rawHtml
        .replace(/></g, ">\n<")
        .replace(/\s{2,}/g, " ")
        .trim();

      htmlOutput.textContent = formattedHtml;
      cssOutput.textContent = message.rawCss;

      // Trigger Prism to highlight the code
      Prism.highlightElement(htmlOutput);
      Prism.highlightElement(cssOutput);

      // Clear and recreate preview container
      previewContainer.replaceWith(previewContainer.cloneNode(false));
      const freshPreviewContainer = document.getElementById("elementPreview");

      // Create shadow DOM
      const shadow = freshPreviewContainer.attachShadow({ mode: "open" });

      // Create and inject styles
      const style = document.createElement("style");
      const bgColor = message.pageBackground;

      style.textContent = `
        :host {
          all: initial;
          display: block;
          background-color: ${bgColor} !important;
          padding: 20px;
          box-sizing: border-box;
        }

        .preview-wrapper {
          all: initial;
          display: block;
        }

        /* Force text property inheritance */
        .selected-element {
          color: inherit;
          font-family: inherit;
          font-size: inherit;
          font-weight: inherit;
          line-height: inherit;
          text-align: inherit;
        }

        /* Reset for proper style application */
        .selected-element, .selected-element * {
          all: revert;
          box-sizing: border-box;
        }

        /* Apply captured styles with text priority */
        ${message.rawCss}

        /* Ensure text styles are preserved in children */
        .selected-element * {
          color: inherit;
          font-family: inherit;
        }

        /* Image handling */
        .selected-element img {
          max-width: 100%;
          height: auto;
        }

        /* Ensure proper positioning */
        .selected-element {
          position: relative !important;
          left: auto !important;
          top: auto !important;
        }
      `;

      // Create wrapper and process content
      const wrapper = document.createElement("div");
      wrapper.className = "preview-wrapper";

      // Parse HTML
      const template = document.createElement("template");
      template.innerHTML = message.rawHtml.trim();
      const element = template.content.firstChild;
      element.classList.add("selected-element");

      // Fix image paths recursively
      function processElement(node) {
        if (node instanceof HTMLImageElement) {
          try {
            const src = node.getAttribute("src");
            if (src && !src.startsWith("data:")) {
              node.src = new URL(src, message.baseUrl).href;
            }
            // Preserve original attributes
            ["width", "height", "alt", "title"].forEach(attr => {
              if (node.hasAttribute(attr)) {
                node.setAttribute(
                  `data-original-${attr}`,
                  node.getAttribute(attr)
                );
              }
            });
          } catch (e) {}
        }
        node.childNodes.forEach(child => {
          if (child.nodeType === 1) processElement(child);
        });
      }

      processElement(element);
      wrapper.appendChild(element);

      // Build preview
      shadow.appendChild(style);
      shadow.appendChild(wrapper);
    }
  });
});
