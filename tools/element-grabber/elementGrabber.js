document.addEventListener("DOMContentLoaded", () => {
  // Go back
  document.getElementById("backToHome").addEventListener("click", () => {
    window.location.href = "../../popup.html";
  });

  // Add this near the top of your DOMContentLoaded handler
  document.querySelectorAll(".code-header").forEach(header => {
    header.addEventListener("click", e => {
      // Don't collapse if clicking the copy button
      if (e.target.classList.contains("copy-button")) return;

      const section = header.closest(".code-section");
      const content = section.querySelector(".code-content");
      const collapseButton = header.querySelector(".collapse-button");

      if (!content.classList.contains("collapsed")) {
        content.classList.add("collapsed");
        collapseButton.classList.add("collapsed");
      } else {
        content.classList.remove("collapsed");
        collapseButton.classList.remove("collapsed");
      }
    });
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

  // Copy button functionality
  const copyHtmlButton = document.getElementById("copyHtmlButton");
  const copyCssButton = document.getElementById("copyCssButton");

  copyHtmlButton.addEventListener("click", async () => {
    const htmlOutput = document.getElementById("htmlOutput");
    await copyToClipboard(htmlOutput.textContent, copyHtmlButton);
  });

  copyCssButton.addEventListener("click", async () => {
    const cssOutput = document.getElementById("cssOutput");
    await copyToClipboard(cssOutput.textContent, copyCssButton);
  });

  async function copyToClipboard(text, button) {
    try {
      await navigator.clipboard.writeText(text);

      // copy notification
      const notification = document.createElement("div");
      notification.textContent = "Copied!";
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #1a73e8;
        color: white;
        padding: 10px 20px;
        border-radius: 4px;
        z-index: 9999;
        animation: fadeOut 1s ease-in-out;
      `;

      const style = document.createElement("style");
      style.textContent = `
        @keyframes fadeOut {
          0% { opacity: 1; }
          90% { opacity: 1; }
          100% { opacity: 0; }
        }
      `;
      document.head.appendChild(style);

      document.body.appendChild(notification);
      setTimeout(() => {
        notification.remove();
        style.remove();
      }, 1000);
    } catch (err) {
      console.error("Failed to copy text:", err);
    }
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
          display: block;
          background-color: ${bgColor} !important;
          padding: 20px;
          box-sizing: border-box;
        }

        .preview-wrapper {
          display: block;
        }

        /* Base theme support */
        :root {
          color-scheme: dark;
        }

        /* Apply the raw CSS directly without interference */
        ${message.rawCss}

        /* Remove any inheritance blocking styles */
        .selected-element {
          display: revert;
        }

        /* Ensure proper inheritance for nested elements */
        .selected-element * {
          color: inherit;
          font-family: inherit;
          font-size: inherit;
          line-height: inherit;
        }

        /* Keep specific styling for interactive elements */
        .selected-element a {
          color: rgb(140, 180, 255);
          text-decoration: underline;
        }

        .selected-element code {
          font-family: Menlo, Consolas, Monaco, monospace;
          background-color: rgb(52, 52, 52);
          padding: 2px 4px;
          border-radius: 4px;
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
