// Check if extension context is valid
function isExtensionContextValid() {
  try {
    return chrome && chrome.runtime && chrome.runtime.id;
  } catch (e) {
    console.warn('Extension context check failed:', e);
    return false;
  }
}

// Track context validity
let isContextValid = true;

// Handle extension context invalidation
function handleContextInvalidation() {
  if (isContextValid) {
    isContextValid = false;
    console.warn('Extension context has been invalidated in background script. Some features may not work properly.');
    
    // Clean up any resources if needed
    try {
      // Additional cleanup could go here if needed
    } catch (e) {
      console.warn('Error during context invalidation cleanup:', e);
    }
  }
}

// Helper function for safe messaging to tabs
function safelyMessageTab(tabId, message, callback) {
  try {
    // Check if extension context is still valid
    if (!isExtensionContextValid()) {
      handleContextInvalidation();
      console.warn('Extension context invalidated, skipping tab messaging');
      return;
    }
    
    chrome.tabs.sendMessage(tabId, message, function(response) {
      // Always check for runtime.lastError to avoid unchecked errors
      if (chrome.runtime.lastError) {
        console.log(`Tab ${tabId}: ${chrome.runtime.lastError.message}`);
        // Don't call callback to avoid additional errors
        return;
      }
      
      // Only call callback if no error and callback exists
      if (callback) {
        callback(response);
      }
    });
  } catch (e) {
    // Check if error is related to context invalidation
    if (e.message && e.message.includes('Extension context invalidated')) {
      handleContextInvalidation();
    }
    console.log(`Error sending message to tab ${tabId}: ${e.message}`);
  }
}

// Safely execute Chrome API functions with error handling
function safelyExecuteChromeAPI(apiCall, fallback) {
  try {
    if (!isExtensionContextValid()) {
      handleContextInvalidation();
      console.warn('Extension context invalidated, skipping Chrome API call');
      return typeof fallback === 'function' ? fallback() : fallback;
    }
    return apiCall();
  } catch (error) {
    // Check if error is related to context invalidation
    if (error.message && error.message.includes('Extension context invalidated')) {
      handleContextInvalidation();
    } else {
      console.warn('Error executing Chrome API:', error);
    }
    return typeof fallback === 'function' ? fallback() : fallback;
  }
}

// Listen for all messages in a single listener to avoid conflicts
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  try {
    console.log('Background received message:', message);
    
    if (message.action === 'pageRefreshed') {
      console.log('Received page refresh notification from tab:', sender.tab?.id);
      
      // When a page is refreshed, check if refresh was needed
      safelyExecuteChromeAPI(() => {
        chrome.storage.local.get(['refreshNeeded', 'settings'], function(data) {
          try {
            // Check for runtime.lastError
            if (chrome.runtime.lastError) {
              console.warn('Error getting storage data:', chrome.runtime.lastError.message);
              if (sendResponse) {
                sendResponse({ success: false, error: chrome.runtime.lastError.message });
              }
              return;
            }
            
            console.log('Current refresh state:', data.refreshNeeded);
            
            if (data.refreshNeeded) {
              console.log('Updating refresh state to false after page refresh');
              // Mark that pages have been refreshed
              safelyExecuteChromeAPI(() => {
                chrome.storage.local.set({ refreshNeeded: false }, function() {
                  try {
                    // Check for runtime.lastError
                    if (chrome.runtime.lastError) {
                      console.warn('Error setting storage data:', chrome.runtime.lastError.message);
                      if (sendResponse) {
                        sendResponse({ success: false, error: chrome.runtime.lastError.message });
                      }
                      return;
                    }
                    
                    // Verify the storage was updated
                    console.log('Refresh state updated to false');
                    // Send response back to content script
                    if (sendResponse) {
                      sendResponse({ success: true });
                    }
                  } catch (error) {
                    console.warn('Error in storage callback:', error);
                    if (sendResponse) {
                      sendResponse({ success: false, error: error.message });
                    }
                  }
                });
              });
            } else {
              // Send response even if no update was needed
              if (sendResponse) {
                sendResponse({ success: true, noUpdateNeeded: true });
              }
            }
          } catch (error) {
            console.warn('Error processing page refresh:', error);
            if (sendResponse) {
              sendResponse({ success: false, error: error.message });
            }
          }
        });
      });
      
      // Required for asynchronous sendResponse
      return true;
    }
    else if (message.action === 'refreshTabs') {
      console.log('Received refreshTabs action, refreshing tabs...');
      
      // First, set a flag to prevent infinite refresh loops
      safelyExecuteChromeAPI(() => {
        chrome.storage.local.set({ isRefreshing: true }, function() {
          try {
            // Check for runtime.lastError
            if (chrome.runtime.lastError) {
              console.warn('Error setting isRefreshing flag:', chrome.runtime.lastError.message);
              if (sendResponse) {
                sendResponse({ success: false, error: chrome.runtime.lastError.message });
              }
              return;
            }
            
            // Get all tabs
            safelyExecuteChromeAPI(() => {
              chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                try {
                  // Check for runtime.lastError
                  if (chrome.runtime.lastError) {
                    console.warn('Error querying tabs:', chrome.runtime.lastError.message);
                    if (sendResponse) {
                      sendResponse({ success: false, error: chrome.runtime.lastError.message });
                    }
                    return;
                  }
                  
                  if (tabs.length > 0) {
                    console.log('Refreshing active tab:', tabs[0].id);
                    safelyExecuteChromeAPI(() => {
                      chrome.tabs.reload(tabs[0].id, function() {
                        // Check for runtime.lastError
                        if (chrome.runtime.lastError) {
                          console.warn('Error reloading tab:', chrome.runtime.lastError.message);
                          if (sendResponse) {
                            sendResponse({ success: false, error: chrome.runtime.lastError.message });
                          }
                          return;
                        }
                        
                        // Reset the refresh needed flag
                        safelyExecuteChromeAPI(() => {
                          chrome.storage.local.set({ 
                            refreshNeeded: false,
                            isRefreshing: false
                          }, function() {
                            try {
                              // Check for runtime.lastError
                              if (chrome.runtime.lastError) {
                                console.warn('Error resetting flags:', chrome.runtime.lastError.message);
                                if (sendResponse) {
                                  sendResponse({ success: false, error: chrome.runtime.lastError.message });
                                }
                                return;
                              }
                              
                              console.log('Refresh completed and flags reset');
                              if (sendResponse) {
                                sendResponse({ success: true });
                              }
                            } catch (error) {
                              console.warn('Error in storage callback:', error);
                              if (sendResponse) {
                                sendResponse({ success: false, error: error.message });
                              }
                            }
                          });
                        });
                      });
                    });
                  } else {
                    console.warn('No active tabs found to refresh');
                    if (sendResponse) {
                      sendResponse({ success: false, error: 'No active tabs found' });
                    }
                  }
                } catch (error) {
                  console.warn('Error in tabs query callback:', error);
                  if (sendResponse) {
                    sendResponse({ success: false, error: error.message });
                  }
                }
              });
            });
          } catch (error) {
            console.warn('Error in storage callback:', error);
            if (sendResponse) {
              sendResponse({ success: false, error: error.message });
            }
          }
        });
      });
      
      return true; // Indicate we'll respond asynchronously
    }
  } catch (error) {
    console.warn('Error in message listener:', error);
    if (sendResponse) {
      sendResponse({ success: false, error: error.message });
    }
  }
});

// When extension is installed or updated
chrome.runtime.onInstalled.addListener(function() {
  try {
    // Initialize refresh needed state to false
    safelyExecuteChromeAPI(() => {
      chrome.storage.local.set({ 
        refreshNeeded: false,
        isRefreshing: false
      }, function() {
        // Check for runtime.lastError
        if (chrome.runtime.lastError) {
          console.warn('Error initializing storage:', chrome.runtime.lastError.message);
          return;
        }
        console.log('Extension installed/updated, refresh state initialized to false');
      });
    });
  } catch (error) {
    console.warn('Error in onInstalled handler:', error);
  }
});

// Listen for storage changes to propagate animation speed settings to content scripts
chrome.storage.onChanged.addListener(function(changes, namespace) {
  try {
    if (namespace === 'local' && changes.settings) {
      const newSettings = changes.settings.newValue;
      const oldSettings = changes.settings.oldValue || {};
      
      // Check if animation speed changed
      if (newSettings.waveEffect && 
          (!oldSettings.animationSpeed || 
           newSettings.animationSpeed !== oldSettings.animationSpeed)) {
        
        // Update all tabs with new animation speed
        safelyExecuteChromeAPI(() => {
          chrome.tabs.query({}, function(tabs) {
            try {
              // Check for runtime.lastError
              if (chrome.runtime.lastError) {
                console.warn('Error querying tabs for animation update:', chrome.runtime.lastError.message);
                return;
              }
              
              tabs.forEach(tab => {
                safelyMessageTab(tab.id, {
                  action: 'updateAnimationSpeed',
                  speedSetting: newSettings.animationSpeed
                });
              });
            } catch (error) {
              console.warn('Error in tabs query callback:', error);
            }
          });
        });
      }
    }
  } catch (error) {
    console.warn('Error in storage change listener:', error);
  }
});

// Listen for context invalidation errors
chrome.runtime.onSuspend.addListener(function() {
  try {
    console.log('Extension is being suspended');
    // Perform any cleanup needed before suspension
  } catch (error) {
    console.warn('Error in onSuspend handler:', error);
  }
}); 