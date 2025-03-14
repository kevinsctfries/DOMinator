let isEditMode = false;
let selectedElement = null;

function enableEditMode() {
  isEditMode = true;
  document.body.style.cursor = "crosshair";
  addHoverListeners();
}

function disableEditMode() {
  isEditMode = false;
  document.body.style.cursor = "default";
  removeHoverListeners();
}

function addHoverListeners() {
  document.addEventListener("mouseover", handleMouseOver);
  document.addEventListener("mouseout", handleMouseOut);
  document.addEventListener("click", handleClick, true);
}

function removeHoverListeners() {
  document.removeEventListener("mouseover", handleMouseOver);
  document.removeEventListener("mouseout", handleMouseOut);
  document.removeEventListener("click", handleClick, true);
}

function handleMouseOver(e) {
  if (!isEditMode) return;
  e.target.style.outline = "2px solid #007bff";
}

function handleMouseOut(e) {
  if (!isEditMode) return;
  e.target.style.outline = "";
}

function handleClick(e) {
  if (!isEditMode) return;
  e.preventDefault();
  e.stopPropagation();

  selectedElement = e.target;
  const styles = window.getComputedStyle(selectedElement);
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
  if (message.type === "TOGGLE_EDIT_MODE") {
    if (!isEditMode) {
      enableEditMode();
    } else {
      disableEditMode();
    }
  }
});

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
