console.log("Popup script loaded");

document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM Content Loaded");

  const editModeButton = document.getElementById("editMode");
  if (editModeButton) {
    console.log("Edit mode button found");
    editModeButton.addEventListener("click", () => {
      console.log("Edit Mode Toggled");
      chrome.runtime.sendMessage({ type: "TOGGLE_EDIT_MODE" });
    });
  } else {
    console.error("Edit mode button not found");
  }

  document.getElementById("reset").addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    chrome.tabs.reload(tab.id);
  });

  chrome.runtime.onMessage.addListener((message, sender) => {
    if (message.type === "ELEMENT_SELECTED") {
      displayCSS(message.css);
    }
  });

  function displayCSS(cssProperties) {
    const propertiesDiv = document.getElementById("cssProperties");
    propertiesDiv.innerHTML = "";

    for (let [property, value] of Object.entries(cssProperties)) {
      const propertyElement = document.createElement("div");
      propertyElement.className = "css-property";
      propertyElement.textContent = `${property}: ${value};`;
      propertiesDiv.appendChild(propertyElement);
    }
  }

  // Keep popup open
  document.documentElement.addEventListener("click", e => {
    e.stopPropagation();
  });

  // Prevent popup from closing
  window.addEventListener("blur", e => {
    e.stopPropagation();
    e.preventDefault();
  });

  document.addEventListener("click", e => {
    e.stopPropagation();
  });
});
