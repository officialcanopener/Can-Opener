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
            traverseDOM(document.body);
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
      traverseDOM(document.body);
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
            traverseDOM(document.body);
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

// Function to fetch token metadata from Jupiter API
async function fetchTokenMetadata(address) {
  try {
    // Use Jupiter's individual token endpoint
    const response = await fetch(`https://api.jup.ag/tokens/v1/token/${address}`);
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    const data = await response.json();
    
    // Check if we have valid token data
    if (data && data.symbol) {
      return {
        name: data.name || 'Unknown Token',
        symbol: data.symbol || '???',
        logoURI: data.logoURI || null
      };
    }
  } catch (error) {
    console.error('Error fetching token metadata:', error);
  }
  
  // Return default values if we couldn't get the data
  return {
    name: 'Unknown Token',
    symbol: '???',
    logoURI: null
  };
}

// Cache for token metadata to avoid repeated API calls
let tokenMetadataCache = null;

// Function to fetch and cache all token metadata
async function fetchAndCacheTokenMetadata() {
  if (tokenMetadataCache) {
    return tokenMetadataCache;
  }

  try {
    const response = await fetch('https://token.jup.ag/all');
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    const data = await response.json();
    // Create a map for faster lookups
    tokenMetadataCache = new Map(data.map(token => [token.address, token]));
    return tokenMetadataCache;
  } catch (error) {
    console.error('Error fetching token list:', error);
    return new Map();
  }
}

// Function to store address in recent list
async function storeRecentAddress(address) {
  try {
    // Don't proceed if extension context is invalid
    if (!isContextValid) return;
    
    // Fetch token metadata directly
    const tokenMetadata = await fetchTokenMetadata(address);
    
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
            pageTitle: document.title,
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
      wave: 6,   // Slower speed for WAVE state
      fast: 1,   // Fast speed for FAST state
      static: 0, // Not used for animation
      // For backward compatibility
      slow: 6,
      medium: 3,
      fast: 1
    };
    const speedSetting = currentSettings.animationSpeed || 'medium';
    const speedValue = speedValues[speedSetting] || speedValues.wave;
    const delayFactor = speedValue === 6 ? 0.08 : 0.02;
    
    // Add the address text
    if (currentSettings.waveEffect) {
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
        
        // For Discord, add explicit animation properties
        if (isDiscord) {
          span.style.animationDuration = `${speedValue}s`;
          span.style.animationDelay = `calc(${index} * ${delayFactor}s)`;
        }
        
        link.appendChild(span);
      });
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
    for (let i = 0; i < node.childNodes.length; i++) {
      traverseDOM(node.childNodes[i]);
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
try {
  observer = new MutationObserver((mutations) => {
    try {
      // Skip if extension is inactive or context invalid
      if (!currentSettings.extensionActive || !isContextValid) return;
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            traverseDOM(node);
          });
        }
      });
    } catch (error) {
      console.warn('Error in MutationObserver callback:', error);
    }
  });

  // Start observing if extension is active
  if (currentSettings.extensionActive) {
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
} catch (error) {
  console.warn('Error setting up MutationObserver:', error);
}

// When page loads fully, notify the background that this tab has been refreshed
window.addEventListener('load', function() {
  try {
    // Small delay to ensure extension is ready to receive messages
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
    }, 500);
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
      wave: 6,   // Slower speed for WAVE state
      fast: 1,   // Fast speed for FAST state
      static: 0, // Not used for animation
      // For backward compatibility
      slow: 6,
      medium: 3,
      fast: 1
    };
    
    // Set default to wave if not found
    const speedValue = speedValues[speedSetting] || speedValues.wave;
    
    // Calculate delay factor
    const delayFactor = speedValue === 6 ? 0.08 : 0.02;
    
    // Set CSS variables
    root.style.setProperty('--animation-speed', `${speedValue}s`);
    root.style.setProperty('--animation-delay-factor', `${delayFactor}s`);
    
    // Discord-specific handling: Apply styles directly to elements
    // This is needed because Discord uses a complex DOM structure with Shadow DOM
    if (window.location.hostname.includes('discord.com')) {
      // Find all chroma-wave elements and apply the new speed directly
      const chromeElements = document.querySelectorAll('.chroma-wave, .site-link, .wave-text, .chroma-char');
      chromeElements.forEach(el => {
        if (el.classList.contains('chroma-char')) {
          // For individual characters, set their animation duration
          el.style.animationDuration = `${speedValue}s`;
          
          // Calculate and set the animation delay based on the character index
          const charIndex = el.style.getPropertyValue('--char-index') || 0;
          el.style.animationDelay = `calc(${charIndex} * ${delayFactor}s)`;
        } else if (el.classList.contains('wave-text') || el.classList.contains('site-link')) {
          // For container elements, ensure their children have the correct timing
          const chars = el.querySelectorAll('.chroma-char');
          chars.forEach((char, index) => {
            char.style.animationDuration = `${speedValue}s`;
            char.style.animationDelay = `calc(${index} * ${delayFactor}s)`;
          });
        }
      });
    }
    
    // Set the restart timestamp if provided
    if (restartTimestamp) {
      root.style.setProperty('--animation-restart', restartTimestamp + 'ms');
    }
  } catch (error) {
    console.warn('Error applying animation speed:', error);
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
    
    // Discord-specific handling
    if (window.location.hostname.includes('discord.com')) {
      // Find all animated elements
      const animatedElements = document.querySelectorAll('.chroma-char, .site-link, .wave-text');
      
      // Reset and restart their animations
      animatedElements.forEach(el => {
        // Store original animation
        const originalAnimation = window.getComputedStyle(el).animation;
        
        // Temporarily disable animation
        el.style.animation = 'none';
        
        // Force reflow
        void el.offsetWidth;
        
        // If this is a character with direct animation
        if (el.classList.contains('chroma-char')) {
          // Don't restore via blank string, use the computed value
          if (originalAnimation && originalAnimation !== 'none') {
            el.style.animation = originalAnimation;
          } else {
            el.style.animation = ''; // Remove the inline style
          }
        }
        // If this is a container that might have animated children
        else if (el.classList.contains('site-link') || el.classList.contains('wave-text')) {
          el.style.animation = '';
          
          // Also restart animations for its children
          const chars = el.querySelectorAll('.chroma-char');
          chars.forEach(char => {
            const charOrigAnim = window.getComputedStyle(char).animation;
            char.style.animation = 'none';
            void char.offsetWidth;
            
            if (charOrigAnim && charOrigAnim !== 'none') {
              char.style.animation = charOrigAnim;
            } else {
              char.style.animation = '';
            }
          });
        }
      });
    }
    
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
