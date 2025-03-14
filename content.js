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

  // Remove any remaining outlines
  const elements = document.querySelectorAll("*");
  elements.forEach(el => (el.style.outline = ""));
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

  const styles = window.getComputedStyle(e.target);
  const cssProperties = {};

  for (let prop of styles) {
    cssProperties[prop] = styles.getPropertyValue(prop);
  }

  chrome.runtime.sendMessage({
    type: "ELEMENT_SELECTED",
    css: cssProperties,
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "EDIT_MODE_CHANGED") {
    if (message.isActive) {
      enableEditMode();
    } else {
      disableEditMode();
    }
  }
});

// Add this to prevent the popup from closing when clicking the page
window.addEventListener("click", e => {
  if (isEditMode) {
    e.stopPropagation();
  }
});
