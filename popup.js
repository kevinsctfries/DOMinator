document.addEventListener("DOMContentLoaded", () => {
  console.log("Popup initialized");

  const editModeButton = document.getElementById("editMode");
  let isEditModeActive = false;

  editModeButton.addEventListener("click", async () => {
    try {
      // Get the original tab ID from background script
      const response = await chrome.runtime.sendMessage({
        type: "GET_ORIGINAL_TAB",
      });
      if (!response?.tabId) {
        throw new Error("Could not find original tab");
      }

      const tabId = response.tabId;
      console.log("Using original tab:", tabId);

      // Inject the content script
      try {
        await chrome.scripting.executeScript({
          target: { tabId },
          files: ["content.js"],
        });
        console.log("Content script injected");
      } catch (err) {
        console.log("Script injection error (might already be loaded):", err);
      }

      // Toggle state
      isEditModeActive = !isEditModeActive;
      console.log("Setting edit mode to:", isEditModeActive);

      // Update button
      editModeButton.textContent = isEditModeActive
        ? "Disable Edit Mode"
        : "Enable Edit Mode";
      editModeButton.className = isEditModeActive ? "active" : "";

      // Send toggle message to the original tab
      const msgResponse = await chrome.tabs.sendMessage(tabId, {
        type: "TOGGLE_EDIT_MODE",
        isActive: isEditModeActive,
      });

      console.log("Response:", msgResponse);
    } catch (error) {
      console.error("Error:", error);
      // Revert button state
      isEditModeActive = !isEditModeActive;
      editModeButton.textContent = isEditModeActive
        ? "Disable Edit Mode"
        : "Enable Edit Mode";
      editModeButton.className = isEditModeActive ? "active" : "";
    }
  });

  document.getElementById("reset").addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    chrome.tabs.reload(tab.id);
  });

  chrome.runtime.onMessage.addListener(message => {
    if (message.type === "ELEMENT_SELECTED") {
      displayCSS(message.css);
    }
  });

  function displayCSS(cssProperties) {
    const propertiesDiv = document.getElementById("cssProperties");
    propertiesDiv.innerHTML = "";

    // Group properties by category
    const categories = {
      Layout: ["display", "position", "width", "height", "margin", "padding"],
      Typography: ["font", "text", "color", "line-height"],
      Visual: ["background", "border", "box-shadow", "opacity"],
      Transform: ["transform", "transition", "animation"],
      Other: [],
    };

    const categorizedProps = {};
    for (const [prop, value] of Object.entries(cssProperties)) {
      let categorized = false;
      for (const [category, patterns] of Object.entries(categories)) {
        if (patterns.some(pattern => prop.startsWith(pattern))) {
          categorizedProps[category] = categorizedProps[category] || {};
          categorizedProps[category][prop] = value;
          categorized = true;
          break;
        }
      }
      if (!categorized) {
        categorizedProps["Other"] = categorizedProps["Other"] || {};
        categorizedProps["Other"][prop] = value;
      }
    }

    // Create and append category sections
    for (const [category, props] of Object.entries(categorizedProps)) {
      if (Object.keys(props).length === 0) continue;

      const categoryDiv = document.createElement("div");
      categoryDiv.className = "css-category";

      const categoryTitle = document.createElement("h3");
      categoryTitle.textContent = category;
      categoryDiv.appendChild(categoryTitle);

      for (const [prop, value] of Object.entries(props)) {
        const propertyElement = document.createElement("div");
        propertyElement.className = "css-property";
        propertyElement.textContent = `${prop}: ${value};`;
        categoryDiv.appendChild(propertyElement);
      }

      propertiesDiv.appendChild(categoryDiv);
    }
  }
});
