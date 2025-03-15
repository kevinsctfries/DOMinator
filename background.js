// State management
let windowId = null;
let originalTabId = null;

// Badge initialization
chrome.action.setBadgeBackgroundColor({ color: "#007bff" });

// Extension icon click handler
chrome.action.onClicked.addListener(async tab => {
    // Store original tab for future reference
    originalTabId = tab.id;

    // Create popup window
    chrome.windows.create({
        url: chrome.runtime.getURL("popup.html"),
        type: "popup",
        width: 400,
        height: 600
    }, window => {
        windowId = window.id;
    });
});

// Window lifecycle management
chrome.windows.onCreated.addListener(window => {
    if (window.type === "popup") {
        windowId = window.id;
    }
});

chrome.windows.onRemoved.addListener(removedWindowId => {
    if (removedWindowId === windowId) {
        windowId = null;
        chrome.action.setBadgeText({ text: "" });
    }
});

// Message routing system
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Forward element selection to popup
    if (message.type === "ELEMENT_SELECTED") {
        chrome.runtime.sendMessage(message).catch(() => {});
    }
    // Provide original tab reference to popup
    if (message.type === "GET_ORIGINAL_TAB") {
        sendResponse({ tabId: originalTabId });
        return true;
    }
    return true;
});
