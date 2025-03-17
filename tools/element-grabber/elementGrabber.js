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

      // Format and display HTML
      htmlOutput.textContent = message.rawHtml
        .replace(/></g, ">\n<")
        .replace(/\s{2,}/g, " ")
        .trim();

      // Display CSS
      cssOutput.textContent = message.rawCss;
    }
  });

  //   document.getElementById("reset").addEventListener("click", async () => {
  //     const [tab] = await chrome.tabs.query({
  //       active: true,
  //       currentWindow: true,
  //     });
  //     chrome.tabs.reload(tab.id);
  //   });
});
