document.addEventListener("DOMContentLoaded", () => {
  const editModeButton = document.getElementById("editMode");
  editModeButton.addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "TOGGLE_EDIT_MODE" });
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
