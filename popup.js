document.getElementById("editMode").addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "TOGGLE_EDIT_MODE" });
});

document.getElementById("reset").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
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
