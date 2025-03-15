document.addEventListener("DOMContentLoaded", () => {
  // UI element initialization
  const editModeButton = document.getElementById("editMode");
  let isEditModeActive = false;

  // Add tabId tracking
  let activeTabId = null;

  // Edit mode toggle handler
  editModeButton.addEventListener("click", async () => {
    try {
      // Get reference to original tab
      const response = await chrome.runtime.sendMessage({
        type: "GET_ORIGINAL_TAB",
      });
      if (!response?.tabId) {
        throw new Error("Could not find original tab");
      }

      const tabId = response.tabId;
      activeTabId = response.tabId;

      // Inject content script
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ["content.js"],
      });

      // Wait for script initialization
      await new Promise(resolve => setTimeout(resolve, 100));

      // Update UI state
      isEditModeActive = !isEditModeActive;
      updateButtonState(isEditModeActive);

      // Notify content script
      await chrome.tabs.sendMessage(tabId, {
        type: "TOGGLE_EDIT_MODE",
        isActive: isEditModeActive,
      });
    } catch (error) {
      // Revert UI state on error
      isEditModeActive = !isEditModeActive;
      updateButtonState(isEditModeActive);
    }
  });

  // Helper function for button state management
  function updateButtonState(active) {
    editModeButton.textContent = active
      ? "Disable Edit Mode"
      : "Enable Edit Mode";
    editModeButton.className = active ? "active" : "";
  }

  // Page reset handler
  document.getElementById("reset").addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    chrome.tabs.reload(tab.id);
  });

  // CSS display system
  chrome.runtime.onMessage.addListener(message => {
    if (message.type === "ELEMENT_SELECTED") {
      displayCSS(message.css);
    }
  });

  function displayCSS(cssProperties) {
    const propertiesDiv = document.getElementById("cssProperties");
    propertiesDiv.innerHTML = "";

    // CSS property categorization
    const categories = {
      Layout: ["display", "position", "width", "height", "margin", "padding"],
      Typography: ["font", "text", "color", "line-height"],
      Visual: ["background", "border", "box-shadow", "opacity"],
      Transform: ["transform", "transition", "animation"],
      Other: [],
    };

    // Create input handler for CSS updates
    function handleCSSChange(prop, value) {
      if (!activeTabId) return;

      chrome.tabs
        .sendMessage(activeTabId, {
          type: "UPDATE_CSS",
          css: { [prop]: value },
        })
        .catch(console.error);
    }

    // Sort properties into categories
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

    // Render categorized properties
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

        // Create property name label
        const propName = document.createElement("span");
        propName.textContent = `${prop}: `;
        propertyElement.appendChild(propName);

        // Create editable value field
        const valueInput = document.createElement("input");
        valueInput.type = "text";
        valueInput.value = value;
        valueInput.className = "css-value-input";

        // Handle value changes
        valueInput.addEventListener("input", e => {
          handleCSSChange(prop, e.target.value);
        });

        // Update on both input and change events
        valueInput.addEventListener("change", e => {
          handleCSSChange(prop, e.target.value);
        });

        propertyElement.appendChild(valueInput);
        categoryDiv.appendChild(propertyElement);
      }

      propertiesDiv.appendChild(categoryDiv);
    }
  }
});
