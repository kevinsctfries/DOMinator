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
    const defaultElement = document.createElement(element.tagName);
    document.body.appendChild(defaultElement);
    const defaultStyles = window.getComputedStyle(defaultElement);

    const cssProperties = {};
    const importantProperties = [
      "display",
      "position",
      "width",
      "height",
      "margin",
      "padding",
      "border",
      "background-color",
      "color",
      "font-family",
      "font-size",
      "font-weight",
      "text-align",
      "flex",
      "grid",
      "transform",
      "opacity",
      "z-index",
    ];

    // Get explicitly set styles
    for (const prop of computedStyles) {
      const computedValue = computedStyles.getPropertyValue(prop);
      const defaultValue = defaultStyles.getPropertyValue(prop);
      const isImportant = importantProperties.some(p => prop.startsWith(p));

      // Include property if it's different from default or is important
      if (computedValue !== defaultValue || isImportant) {
        cssProperties[prop] = computedValue;
      }
    }

    // Cleanup
    document.body.removeChild(defaultElement);

    chrome.runtime
      .sendMessage({
        type: "ELEMENT_SELECTED",
        css: cssProperties,
        tagName: element.tagName.toLowerCase(),
        classes: Array.from(element.classList),
        id: element.id,
      })
      .catch(() => disableEditMode());
  } catch (error) {
    console.log("Error:", error);
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
