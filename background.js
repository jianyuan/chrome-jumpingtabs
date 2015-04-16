// States

var states = {
  windows: [],
  focusedWindowId: undefined
};

function renderWindowsList() {
  chrome.contextMenus.removeAll(function() {
    states.windows.filter(function(window) {
      return window.id !== states.focusedWindowId;
    }).forEach(function(window) {
      chrome.contextMenus.create({
        type: "radio",
        title: window.title || "Window #" + window.id.toString(),
        contexts: ["browser_action"],
        onclick: function(info, tab) {
          console.log("context menu onclicked", info, tab);
        }
      });
    });
  });
}

var stateCallbacks = {
  focusedWindowId: function(change) {
    renderWindowsList();
  }
};

Object.observe(states, function(changes) {
  changes.filter(function(change) {
    return change.name in stateCallbacks;
  }).forEach(function(change) {
    stateCallbacks[change.name](change);
  });
});

// Windows

function windowsDidChange() {
  chrome.windows.getAll(function(windows) {
    states.windows = windows.filter(function(window) {
      return window.type == "normal";
    });
  });
}

chrome.windows.onCreated.addListener(function(window) {
  windowsDidChange();
});
chrome.windows.onRemoved.addListener(function(window) {
  windowsDidChange();
});
chrome.windows.onFocusChanged.addListener(function(windowId) {
  states.focusedWindowId = windowId;
});

// Browser action click listener

chrome.browserAction.onClicked.addListener(function(tab) {
  otherWindows = states.windows.filter(function(window) {
    return window.id != tab.windowId;
  });

  if (otherWindows.length === 0) {
    // Creates a new window adopting this tab
    chrome.windows.create({
      tabId: tab.id,
      focused: true
    });
  } else {
    // Moves tab to target window
    var wasPinned = tab.pinned;
    chrome.tabs.move(tab.id, {
      windowId: otherWindows[0].id, // TODO: obey window selection
      index: -1
    }, function(tab) {
      chrome.tabs.update(tab.id, {
        active: true,
        pinned: wasPinned
      }, function(tab) {
        chrome.windows.update(tab.windowId, {
          drawAttention: true
        });
      });
    });
  }
});

// DOM loaded listener (Init)

document.addEventListener('DOMContentLoaded', function() {
  windowsDidChange();
  renderWindowsList();
});
