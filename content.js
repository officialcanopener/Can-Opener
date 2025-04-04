// Regular expression to match Solana addresses (base58 encoded, typically 32-44 characters)
const solanaAddressRegex = /\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/g;

// Trading site URL patterns
const siteUrlPatterns = {
  axiom: 'https://axiom.trade/t/[CONTRACT_ADDRESS]/@ref',
  bullx: 'https://neo.bullx.io/terminal?chainId=1399811149&address=[CONTRACT_ADDRESS]',
  photon: 'https://photon-sol.tinyastro.io/en/lp/[CONTRACT_ADDRESS]?handle=25040352b7652e422e0dee',
  gmgn: 'https://gmgn.ai/sol/token/[CONTRACT_ADDRESS]',
  dexscreener: 'https://dexscreener.com/solana/[CONTRACT_ADDRESS]',
  birdeye: 'https://www.birdeye.so/token/[CONTRACT_ADDRESS]?chain=solana'
};

// Trading site logos
const siteLogo = {
  axiom: 'axiom-logo.png',
  bullx: 'bullx-logo.png',
  photon: 'photon-logo.png',
  gmgn: 'gmgn-logo.png',
  dexscreener: 'dexscreener-logo.png',
  birdeye: 'birdeye-logo.png'
};

// Default settings
const defaultSettings = {
  extensionActive: true,
  waveEffect: true,
  staticColor: '#00ff00',
  tradingSite: 'axiom',
  animationSpeed: 'medium'
};

// Current settings
let currentSettings = defaultSettings;
let isContextValid = true; // Track context validity

// Performance optimization flags
const isDiscord = window.location.hostname.includes('discord.com');
const isHighTrafficSite = isDiscord || window.location.hostname.includes('twitter.com');

// Debounce and throttle variables
let processingQueue = [];
let processingTimeout = null;
let lastProcessTime = 0;
const PROCESS_THROTTLE = isDiscord ? 500 : 150; // More aggressive throttling for Discord
const MAX_NODES_PER_BATCH = isDiscord ? 50 : 300;

// Check if extension context is valid
function isExtensionContextValid() {
  try {
    return chrome && chrome.runtime && chrome.runtime.id;
  } catch (e) {
    console.warn('Extension context check failed:', e);
    isContextValid = false;
    return false;
  }
}

// Handle extension context invalidation
function handleContextInvalidation() {
  if (isContextValid) {
    isContextValid = false;
    console.warn('Extension context has been invalidated. Some features may not work properly.');
    
    // Remove any observers/listeners that might cause errors
    if (observer) {
      try {
        observer.disconnect();
        observer = null;
      } catch (e) {
        console.warn('Error disconnecting observer:', e);
      }
    }
    
    // Optionally show a subtle notification to the user
    // that the extension may need to be reloaded
    const notificationDiv = document.createElement('div');
    notificationDiv.style.position = 'fixed';
    notificationDiv.style.bottom = '10px';
    notificationDiv.style.right = '10px';
    notificationDiv.style.padding = '10px';
    notificationDiv.style.background = 'rgba(0, 0, 0, 0.7)';
    notificationDiv.style.color = 'white';
    notificationDiv.style.borderRadius = '5px';
    notificationDiv.style.zIndex = '9999';
    notificationDiv.style.fontSize = '12px';
    notificationDiv.style.maxWidth = '300px';
    notificationDiv.textContent = 'Can Opener extension needs to be refreshed. Please reload the page.';
    document.body.appendChild(notificationDiv);
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
      try {
        if (notificationDiv.parentNode) {
          notificationDiv.parentNode.removeChild(notificationDiv);
        }
      } catch (e) {
        console.warn('Error removing notification:', e);
      }
    }, 10000);
  }
}

// Safely execute chrome API functions
function safelyExecuteChromeAPI(apiCall, fallback) {
  try {
    if (!isExtensionContextValid()) {
      handleContextInvalidation();
      return typeof fallback === 'function' ? fallback() : fallback;
    }
    return apiCall();
  } catch (error) {
    // Check if the error is related to context invalidation
    if (error.message && error.message.includes('Extension context invalidated')) {
      handleContextInvalidation();
    } else {
      console.warn('Error executing Chrome API:', error);
    }
    return typeof fallback === 'function' ? fallback() : fallback;
  }
}

// Load settings with graceful fallback
function loadSettings() {
  safelyExecuteChromeAPI(() => {
    chrome.storage.local.get(['settings'], function(result) {
      try {
        if (result && result.settings) {
          currentSettings = result.settings;
          
          // Apply animation speed settings immediately
          applyAnimationSpeed(currentSettings.animationSpeed);
          
          // If extension is now active and wasn't before, process the DOM
          if (currentSettings.extensionActive) {
            // Use batched processing for Discord
            if (isHighTrafficSite) {
              processBatchedNodes([document.body]);
            } else {
              traverseDOM(document.body);
            }
          }
        }
      } catch (error) {
        console.warn('Error in loadSettings callback:', error);
        // Continue with default settings if there was an error
      }
    });
  }, () => {
    // Fallback - use default settings if chrome API is unavailable
    console.log('Using default settings due to unavailable Chrome API');
    currentSettings = defaultSettings;
    
    // Still try to process DOM with default settings
    if (currentSettings.extensionActive) {
      if (isHighTrafficSite) {
        processBatchedNodes([document.body]);
      } else {
        traverseDOM(document.body);
      }
    }
  });
}

// Listen for settings changes with proper error handling
safelyExecuteChromeAPI(() => {
  try {
    chrome.storage.onChanged.addListener(function(changes, namespace) {
      try {
        if (namespace === 'local' && changes.settings) {
          const oldSettings = currentSettings;
          currentSettings = changes.settings.newValue;
          
          // If extension was turned off, do nothing (let page reload naturally refresh)
          // If extension was turned on, process the DOM again
          if (!oldSettings.extensionActive && currentSettings.extensionActive) {
            if (isHighTrafficSite) {
              processBatchedNodes([document.body]);
            } else {
              traverseDOM(document.body);
            }
          }
        }
      } catch (error) {
        console.warn('Error in storage change listener:', error);
      }
    });
  } catch (error) {
    console.warn('Error setting up storage change listener:', error);
  }
});

// Listen for animation speed updates and restarts from popup
safelyExecuteChromeAPI(() => {
  try {
    chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
      try {
        if (message.action === 'updateAnimationSpeed') {
          // Update CSS variables for animation speed
          applyAnimationSpeed(message.speedSetting, message.restartTimestamp);
          
          // Send response
          if (sendResponse) {
            sendResponse({ success: true });
          }
          return true;
        }
        else if (message.action === 'restartAnimation') {
          // Force animation restart
          forceAnimationRestart(message.restartTimestamp);
          
          // Send response
          if (sendResponse) {
            sendResponse({ success: true });
          }
          return true;
        }
      } catch (error) {
        console.warn('Error in message listener:', error);
        if (sendResponse) {
          sendResponse({ success: false, error: error.message });
        }
      }
      return false;
    });
  } catch (error) {
    console.warn('Error setting up message listener:', error);
  }
});

// High-performance batch processing for Discord and other high-traffic sites
function processBatchedNodes(nodesToProcess) {
  if (!currentSettings.extensionActive || !isContextValid) return;
  
  // Add all nodes to the processing queue
  processingQueue.push(...nodesToProcess);
  
  // If we already have a processing timeout running, just let it handle the new nodes
  if (processingTimeout) return;
  
  // If we're throttling, check if enough time has passed
  const now = Date.now();
  const timeElapsed = now - lastProcessTime;
  
  if (timeElapsed < PROCESS_THROTTLE) {
    // Not enough time has passed, schedule a processing
    processingTimeout = setTimeout(processBatch, PROCESS_THROTTLE - timeElapsed);
    return;
  }
  
  // Process immediately
  processBatch();
}

// Process a batch of nodes from the queue
function processBatch() {
  // Clear the timeout flag
  processingTimeout = null;
  lastProcessTime = Date.now();
  
  // Grab up to MAX_NODES_PER_BATCH nodes from the queue
  const nodesToProcess = processingQueue.splice(0, MAX_NODES_PER_BATCH);
  
  if (nodesToProcess.length === 0) return;
  
  // Process these nodes
  for (const node of nodesToProcess) {
    traverseDOM(node);
  }
  
  // If there are still nodes left in the queue, schedule another batch
  if (processingQueue.length > 0) {
    processingTimeout = setTimeout(processBatch, PROCESS_THROTTLE);
  }
}

// Function to check if a string looks like a valid Solana address
function isSolanaAddress(address) {
  // Basic validation: Solana addresses are base58 encoded
  // They don't contain the characters 0, I, O, or l
  if (address.match(/[0IOl]/)) return false;
  
  // Length check: typically around 32-44 characters
  if (address.length < 32 || address.length > 44) return false;
  
  return true;
}

// Function to create the site-specific icon element
function createSiteIcon() {
  try {
    const img = document.createElement('img');
    const logoFile = siteLogo[currentSettings.tradingSite] || siteLogo.axiom;
    
    // Safely get extension URL
    let iconUrl = '';
    safelyExecuteChromeAPI(() => {
      iconUrl = chrome.runtime.getURL(logoFile);
    });
    
    img.src = iconUrl || ''; // Fallback to empty string if URL can't be retrieved
    img.className = 'site-icon';
    
    // Apply styles directly to the element for more reliable sizing and alignment
    img.style.display = 'inline-block';
    img.style.width = '22px';
    img.style.height = '22px';
    img.style.marginRight = '3px';
    img.style.marginTop = '1px'; // Move slightly up
    img.style.position = 'relative';
    img.style.top = '-1px'; // Fine adjustment for vertical alignment
    img.style.verticalAlign = 'middle';
    img.style.objectFit = 'contain';
    
    return img;
  } catch (error) {
    console.warn('Error creating site icon:', error);
    return document.createElement('span'); // Return empty span as fallback
  }
}

// Function to build URL for the selected trading site
function buildTradingSiteUrl(address) {
  const pattern = siteUrlPatterns[currentSettings.tradingSite] || siteUrlPatterns.axiom;
  return pattern.replace('[CONTRACT_ADDRESS]', address);
}

// Cache for token metadata to avoid repeated API calls
let tokenMetadataCache = {};

// Function to store address in recent list
async function storeRecentAddress(address) {
  try {
    // Don't proceed if extension context is invalid
    if (!isContextValid) return;
    
    // Use a simplified token metadata approach to reduce API calls
    const tokenMetadata = {
      name: 'Unknown Token',
      symbol: '???',
      logoURI: null
    };
    
    safelyExecuteChromeAPI(() => {
      chrome.storage.local.get(['recentAddresses'], function(result) {
        try {
          let recentAddresses = result.recentAddresses || [];
          
          // Remove the address if it already exists to avoid duplicates
          recentAddresses = recentAddresses.filter(item => item.address !== address);
          
          // Add the new address at the beginning with token metadata
          recentAddresses.unshift({
            address: address,
            timestamp: Date.now(),
            pageTitle: document.title || 'Unknown Page',
            pageUrl: window.location.href,
            tokenMetadata: tokenMetadata
          });
          
          // Keep only the 15 most recent addresses
          if (recentAddresses.length > 15) {
            recentAddresses = recentAddresses.slice(0, 15);
          }
          
          chrome.storage.local.set({ recentAddresses: recentAddresses });
        } catch (error) {
          console.warn('Error in storeRecentAddress storage callback:', error);
        }
      });
    });
  } catch (error) {
    console.warn('Error in storeRecentAddress:', error);
  }
}

// Function to wrap addresses with clickable links
function wrapAddressWithLink(node, address, startIndex) {
  try {
    if (!isSolanaAddress(address) || !currentSettings.extensionActive) return null;
    
    const siteUrl = buildTradingSiteUrl(address);
    
    // Create link element
    const link = document.createElement('a');
    link.href = siteUrl;
    link.className = 'site-link';
    if (currentSettings.waveEffect) {
      link.classList.add('chroma-wave');
    }
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    
    // Add click event to store recent address
    link.addEventListener('click', function() {
      storeRecentAddress(address);
    });
    
    // Add site-specific icon
    link.appendChild(createSiteIcon());
    
    // Determine if we're on Discord
    const isDiscord = window.location.hostname.includes('discord.com');
    
    // Animation speed settings
    const speedValues = {
      slow: 6,
      medium: 3,
      fast: 1
    };
    const speedSetting = currentSettings.animationSpeed || 'medium';
    const speedValue = speedValues[speedSetting] || speedValues.medium;
    const delayFactor = speedValue === 6 ? 0.08 : speedValue === 3 ? 0.05 : 0.02;
    
    // Add the address text
    if (currentSettings.waveEffect) {
      // For Discord, simplify the animation to improve performance
      if (isDiscord) {
        // Just create a span with the address instead of letter-by-letter animation
        const span = document.createElement('span');
        span.textContent = address;
        span.className = 'discord-optimized';
        span.style.color = '#00ffff'; // Use a static color on Discord
        link.appendChild(span);
      } else {
        // Normal letter-by-letter effect for other sites
        // Split into individual spans for the chroma effect
        const addressChars = address.split('');
        // Add wave-text class for staggered animation
        link.classList.add('wave-text');
        
        addressChars.forEach((char, index) => {
          const span = document.createElement('span');
          span.textContent = char;
          // Add staggered delay based on character position
          span.style.setProperty('--char-index', index);
          span.className = 'chroma-char';
          
          link.appendChild(span);
        });
      }
    } else {
      // Use a single span with static color
      const span = document.createElement('span');
      span.textContent = address;
      span.style.color = currentSettings.staticColor;
      link.appendChild(span);
    }
    
    return link;
  } catch (error) {
    console.warn('Error in wrapAddressWithLink:', error);
    return null;
  }
}

// Function to process text nodes
function processTextNode(textNode) {
  try {
    // Skip processing if extension is inactive
    if (!currentSettings.extensionActive) return;
    
    const text = textNode.nodeValue;
    const matches = [...text.matchAll(solanaAddressRegex)];
    
    if (!matches.length) return;
    
    const fragment = document.createDocumentFragment();
    let lastIndex = 0;
    
    for (const match of matches) {
      const address = match[0];
      const startIndex = match.index;
      
      if (startIndex > lastIndex) {
        fragment.appendChild(document.createTextNode(text.substring(lastIndex, startIndex)));
      }
      
      const link = wrapAddressWithLink(textNode, address, startIndex);
      if (link) {
        fragment.appendChild(link);
      } else {
        fragment.appendChild(document.createTextNode(address));
      }
      
      lastIndex = startIndex + address.length;
    }
    
    if (lastIndex < text.length) {
      fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
    }
    
    if (textNode.parentNode) {
      textNode.parentNode.replaceChild(fragment, textNode);
    }
  } catch (error) {
    console.warn('Error in processTextNode:', error);
  }
}

// Function to traverse the DOM
function traverseDOM(node) {
  try {
    // Skip processing if extension is inactive
    if (!currentSettings.extensionActive) return;
    
    if (node.nodeType === Node.TEXT_NODE) {
      processTextNode(node);
      return;
    }
    
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    
    // Skip elements that shouldn't be modified
    const tagName = node.tagName.toLowerCase();
    if (['script', 'style', 'noscript', 'textarea', 'input', 'select', 'option'].includes(tagName)) {
      return;
    }
    
    // Skip our own created elements
    if (node.classList && (node.classList.contains('site-link') || node.classList.contains('site-icon'))) {
      return;
    }
    
    // Process child nodes
    const childNodes = node.childNodes;
    for (let i = 0; i < childNodes.length; i++) {
      // On high-traffic sites, queue up child nodes for batch processing instead
      if (isHighTrafficSite && childNodes.length > 10) {
        processBatchedNodes([childNodes[i]]);
      } else {
        traverseDOM(childNodes[i]);
      }
    }
  } catch (error) {
    console.warn('Error in traverseDOM:', error);
  }
}

// Load settings first, then process the DOM
loadSettings();

// Notify background script that the page has loaded/refreshed
safelyExecuteChromeAPI(() => {
  chrome.runtime.sendMessage({ action: 'pageRefreshed' }, function(response) {
    try {
      if (chrome.runtime.lastError) {
        console.warn('Error in pageRefreshed message:', chrome.runtime.lastError.message);
        return;
      }
      
      if (response && response.success) {
        console.log('Background script notified of page refresh');
      }
    } catch (error) {
      console.warn('Error in pageRefreshed response callback:', error);
    }
  });
});

// Set up a mutation observer to handle dynamically loaded content
let observer = null;
let observerThrottleTimer = null;
let pendingMutations = [];

function processPendingMutations() {
  if (!pendingMutations.length) return;
  
  // Skip if extension is inactive or context invalid
  if (!currentSettings.extensionActive || !isContextValid) {
    pendingMutations = [];
    return;
  }
  
  // Get the unique nodes to process (avoid duplicates)
  const nodesToProcess = new Set();
  
  pendingMutations.forEach(mutation => {
    if (mutation.type === 'childList') {
      mutation.addedNodes.forEach(node => {
        nodesToProcess.add(node);
      });
    }
  });
  
  // Clear the pending mutations
  pendingMutations = [];
  
  // Process the nodes in batches for high-traffic sites
  if (isHighTrafficSite) {
    processBatchedNodes(Array.from(nodesToProcess));
  } else {
    // Process directly for regular sites
    nodesToProcess.forEach(node => {
      traverseDOM(node);
    });
  }
}

try {
  observer = new MutationObserver((mutations) => {
    try {
      // Skip if extension is inactive or context invalid
      if (!currentSettings.extensionActive || !isContextValid) return;
      
      // Add these mutations to the pending list
      pendingMutations.push(...mutations);
      
      // Throttle processing for Discord and other high-volume sites
      if (isHighTrafficSite) {
        if (!observerThrottleTimer) {
          observerThrottleTimer = setTimeout(() => {
            observerThrottleTimer = null;
            processPendingMutations();
          }, 500); // 500ms throttle for high-traffic sites
        }
      } else {
        // Process immediately for regular sites
        processPendingMutations();
      }
    } catch (error) {
      console.warn('Error in MutationObserver callback:', error);
    }
  });

  // Start observing if extension is active, with site-specific options
  if (currentSettings.extensionActive) {
    // For Discord, only observe a subset of mutations to reduce overhead
    if (isDiscord) {
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: false, // Ignore attribute changes to reduce overhead
        characterData: false // Ignore text changes to reduce overhead
      });
    } else {
      // Regular observation for other sites
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    }
  }
} catch (error) {
  console.warn('Error setting up MutationObserver:', error);
}

// When page loads fully, notify the background that this tab has been refreshed
window.addEventListener('load', function() {
  try {
    // Shorter delay for the initial load notification
    setTimeout(() => {
      safelyExecuteChromeAPI(() => {
        // Send a message to the extension that this page has been refreshed
        chrome.runtime.sendMessage({
          action: 'pageRefreshed',
          url: window.location.href,
          timestamp: Date.now()
        }, function(response) {
          try {
            if (chrome.runtime.lastError) {
              console.warn('Error in pageRefreshed load message:', chrome.runtime.lastError.message);
              return;
            }
            
            // Callback to verify the message was received
            console.log('Page refresh notification sent');
          } catch (error) {
            console.warn('Error in pageRefreshed onload callback:', error);
          }
        });
      });
    }, 200); // Reduced from 500ms to 200ms
  } catch (error) {
    console.warn('Error in window.onload:', error);
  }
});

// Listen for context invalidation events
window.addEventListener('error', function(event) {
  // Check for extension context invalidation errors
  if (event && event.error && event.error.message && 
      event.error.message.includes('Extension context invalidated')) {
    handleContextInvalidation();
  }
});

// Function to apply animation speed based on the setting
function applyAnimationSpeed(speedSetting, restartTimestamp) {
  try {
    const root = document.documentElement;
    const speedValues = {
      slow: 6,
      medium: 3,
      fast: 1
    };
    
    // Set default to medium if not found
    const speedValue = speedValues[speedSetting] || speedValues.medium;
    
    // Calculate delay factor
    const delayFactor = speedValue === 6 ? 0.08 : speedValue === 3 ? 0.05 : 0.02;
    
    // Set CSS variables
    root.style.setProperty('--animation-speed', `${speedValue}s`);
    root.style.setProperty('--animation-delay-factor', `${delayFactor}s`);
    
    // If restart timestamp provided, restart animations
    if (restartTimestamp) {
      // Use modulo 1000 to keep delay within reasonable range
      root.style.setProperty('--animation-restart', `-${restartTimestamp % 1000}ms`);
    }
    
    // Discord-specific handling is now simplified - we don't use character animations there
  } catch (error) {
    console.warn('Error in applyAnimationSpeed:', error);
  }
}

// Force all animations to restart
function forceAnimationRestart(timestamp) {
  try {
    const root = document.documentElement;
    
    // Step 1: Set the restart variable
    root.style.setProperty('--animation-restart', `-${timestamp % 1000}ms`);
    
    // Step 2: Force a style recalculation to ensure the animations restart
    root.classList.add('force-animation-restart');
    
    // Step 3: Force browser to process changes
    void root.offsetWidth;
    
    // Step 4: Remove the class
    root.classList.remove('force-animation-restart');
    
    // No Discord-specific handling to reduce complexity
    
    // Step 5: Re-apply animation speed values to ensure consistency
    safelyExecuteChromeAPI(() => {
      chrome.storage.local.get(['settings'], function(result) {
        try {
          if (chrome.runtime.lastError) {
            console.warn('Error in getting settings:', chrome.runtime.lastError.message);
            return;
          }
          
          if (result.settings && result.settings.animationSpeed) {
            applyAnimationSpeed(result.settings.animationSpeed);
          }
        } catch (error) {
          console.warn('Error in forceAnimationRestart storage callback:', error);
        }
      });
    });
  } catch (error) {
    console.warn('Error in forceAnimationRestart:', error);
  }
}
