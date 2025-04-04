document.addEventListener('DOMContentLoaded', function() {
  // Set document dimensions immediately to avoid resize flicker
  document.documentElement.style.minWidth = "400px";
  document.documentElement.style.minHeight = "600px";
  document.body.style.minWidth = "400px";
  document.body.style.minHeight = "600px";
  
  // Add event listener for the website button
  const websiteButton = document.getElementById('website-button');
  if (websiteButton) {
    websiteButton.addEventListener('click', function() {
      window.open('https://officialcanopener.github.io/Can-Opener/', '_blank');
    });
  }
  
  // Add event listener for the tip dev button
  const tipDevButton = document.getElementById('tip-dev-button');
  if (tipDevButton) {
    tipDevButton.addEventListener('click', function() {
      window.open('https://officialcanopener.github.io/Can-Opener/#supportDev', '_blank');
    });
  }
  
  const recentAddressesList = document.getElementById('recent-addresses-list');
  const extensionActiveToggle = document.getElementById('extension-active');
  const waveEffectToggle = document.getElementById('wave-effect');
  const staticColorPicker = document.getElementById('static-color');
  const colorValue = document.querySelector('.color-value');
  const statusIndicator = document.getElementById('status-indicator');
  const effectIndicator = document.getElementById('effect-indicator');
  const colorPickerContainer = document.getElementById('color-picker-container');
  const effectTypeSpan = document.getElementById('effect-type');
  const tradingSiteSelect = document.getElementById('trading-site'); // Hidden select
  const statusBanner = document.getElementById('status-banner');
  const statusMessage = document.getElementById('status-message');
  const titleText = document.getElementById('title-text');
  
  // Flag to track current settings
  let isExtensionActive = true;
  let isWaveEffect = true;
  // New flag to track if we're in FAST mode
  let isFastMode = false;
  
  // Flag to track if settings have been changed and a refresh is needed
  let refreshNeeded = false;
  
  // Site buttons elements
  const siteButtons = document.querySelectorAll('.site-button');
  
  // Default settings
  const defaultSettings = {
    extensionActive: true,
    waveEffect: true,
    staticColor: '#8C00FF',
    tradingSite: 'axiom',
    animationSpeed: 'medium', // Keep this for backward compatibility
    fastMode: false // Add fastMode setting
  };
  
  // Animation speed values in seconds
  const animationSpeeds = {
    slow: 6,
    medium: 3,
    fast: 1
  };
  
  // Check if extension context is valid
  function isExtensionContextValid() {
    return chrome.runtime && chrome.runtime.id;
  }
  
  // Safely execute Chrome API functions with error handling
  function safelyExecuteChromeAPI(apiCall, fallback) {
    try {
      if (!isExtensionContextValid()) {
        console.warn('Extension context invalidated, skipping Chrome API call');
        return typeof fallback === 'function' ? fallback() : fallback;
      }
      return apiCall();
    } catch (error) {
      console.warn('Error executing Chrome API:', error);
      return typeof fallback === 'function' ? fallback() : fallback;
    }
  }
  
  // Helper function for safe messaging to tabs
  function safelyMessageTab(tabId, message, callback) {
    try {
      // Check if extension context is still valid
      if (!isExtensionContextValid()) {
        console.warn('Extension context invalidated, skipping tab messaging');
        return;
      }
      
      chrome.tabs.sendMessage(tabId, message, function(response) {
        try {
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
        } catch (error) {
          console.warn('Error in tab message callback:', error);
        }
      });
    } catch (e) {
      console.log(`Error sending message to tab ${tabId}: ${e.message}`);
    }
  }
  
  // Function to broadcast a message to all tabs safely
  function broadcastToAllTabs(message, callback) {
    safelyExecuteChromeAPI(() => {
      chrome.tabs.query({}, function(tabs) {
        try {
          tabs.forEach(tab => {
            safelyMessageTab(tab.id, message);
          });
          
          // Call the callback after attempting to message all tabs
          if (callback) {
            callback();
          }
        } catch (error) {
          console.warn('Error in broadcast tabs query callback:', error);
        }
      });
    });
  }
  
  // Function to restart all animations in sync
  function restartAllAnimations() {
    try {
      // Generate a timestamp to use as our sync point
      const timestamp = Date.now();
      const root = document.documentElement;
      
      // Use the animation-delay property for perfect synchronization
      // This value will be the same for all elements so they start from the same point
      root.style.setProperty('--animation-restart', `-${timestamp % 1000}ms`);
      
      // Apply the same initial color to all animated elements based on the timestamp
      const initialColor = getColorForTimestamp(timestamp);
      
      // Force a reflow to ensure the new animation-delay is applied
      void root.offsetWidth;
      
      // Handle all the character spans in the title
      const titleElement = document.getElementById('title-text');
      if (titleElement) {
        synchronizeElement(titleElement, timestamp, initialColor);
      }
      
      // Handle all the character spans in token names
      document.querySelectorAll('.token-name.chroma-wave').forEach(element => {
        synchronizeElement(element, timestamp, initialColor);
      });
      
      // Handle all wave-active buttons (WAVE, FAST, status indicators)
      document.querySelectorAll('.status-indicator.wave-active, .status-indicator.fast-mode').forEach(element => {
        // For these elements, we need to restart their animations directly
        element.style.animation = 'none';
        void element.offsetWidth; // Force reflow
        element.style.animation = '';
        
        // Apply initial color to match starting point
        element.style.backgroundColor = `${initialColor}33`; // 33 = 20% opacity
        element.style.color = initialColor;
        element.style.borderColor = initialColor;
      });
      
      // Handle all active speed options if they exist
      document.querySelectorAll('.speed-option.active').forEach(element => {
        // For these elements, we need to restart their animations directly
        element.style.animation = 'none';
        void element.offsetWidth; // Force reflow
        element.style.animation = '';
        
        // Apply initial color to match starting point
        element.style.backgroundColor = `${initialColor}33`; // 33 = 20% opacity
        element.style.color = initialColor;
        element.style.borderColor = initialColor;
      });
      
      // Handle all active site buttons
      document.querySelectorAll('.site-button.active').forEach(element => {
        if (element.style.animation !== 'none') {
          // For these elements, we need to restart their animations directly
          element.style.animation = 'none';
          void element.offsetWidth; // Force reflow
          element.style.animation = '';
          
          // Apply initial color to match starting point
          element.style.backgroundColor = `${initialColor}33`; // 33 = 20% opacity
          element.style.borderColor = initialColor;
        }
      });
      
      // Broadcast restart message to content scripts
      broadcastToAllTabs({
        action: 'restartAnimation',
        restartTimestamp: timestamp
      });
    } catch (error) {
      console.warn('Error in restartAllAnimations:', error);
    }
  }
  
  // Helper function to synchronize an element with wave effects
  function synchronizeElement(element, timestamp, initialColor) {
    if (!element) return;
    
    const chars = element.querySelectorAll('.chroma-char');
    if (chars.length > 0) {
      // For each character in the wave effect
      chars.forEach((char, index) => {
        // For each character, calculate its exact position in the animation cycle
        const charColor = getColorForIndex(index, timestamp);
        
        // Apply the color directly to synchronize all characters
        char.style.color = charColor;
        
        // Also ensure the animation-delay is properly set
        char.style.animationDelay = `calc(var(--animation-restart) + ${index} * var(--animation-delay-factor))`;
      });
    }
  }
  
  // Function to get color for a specific timestamp
  function getColorForTimestamp(timestamp) {
    // Define the color positions in the cycle (matching our keyframes)
    const colors = [
      '#ff0000', // Red - 0%
      '#ff4000', // Red-Orange - 8.333%
      '#ff8000', // Orange - 16.666%
      '#ffff00', // Yellow - 25%
      '#80ff00', // Yellow-Green - 33.333%
      '#00ff00', // Green - 41.666%
      '#00ff80', // Green-Cyan - 50%
      '#00ffff', // Cyan - 58.333%
      '#0080ff', // Light Blue - 66.666%
      '#0000ff', // Blue - 75%
      '#8000ff', // Indigo - 83.333%
      '#ff00ff', // Magenta - 91.666%
      '#ff0000'  // Red - 100% (same as 0% for looping)
    ];
    
    // Use timestamp to determine position in animation cycle
    // We'll use modulo to wrap around the animation duration
    const animSpeed = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--animation-speed')) || 3;
    const cycleDuration = animSpeed * 1000; // Convert to ms
    const cyclePosition = (timestamp % cycleDuration) / cycleDuration; // 0 to 1
    
    // Find the closest color
    const position12 = cyclePosition * 12; // Scale to 0-12 range for our 12 colors
    const lowerIndex = Math.floor(position12);
    const upperIndex = Math.ceil(position12) % colors.length;
    const blend = position12 - lowerIndex;
    
    // Simple color interpolation
    return blend < 0.5 ? colors[lowerIndex] : colors[upperIndex];
  }
  
  // Helper function to get color for a specific character index
  function getColorForIndex(index, timestamp) {
    // Define the color positions in the cycle (matching our keyframes)
    const colors = [
      '#ff0000', // Red - 0%
      '#ff4000', // Red-Orange - 8.333%
      '#ff8000', // Orange - 16.666%
      '#ffff00', // Yellow - 25%
      '#80ff00', // Yellow-Green - 33.333%
      '#00ff00', // Green - 41.666%
      '#00ff80', // Green-Cyan - 50%
      '#00ffff', // Cyan - 58.333%
      '#0080ff', // Light Blue - 66.666%
      '#0000ff', // Blue - 75%
      '#8000ff', // Indigo - 83.333%
      '#ff00ff', // Magenta - 91.666%
      '#ff0000'  // Red - 100% (same as 0% for looping)
    ];
    
    // Get delay factor from CSS variable
    const root = document.documentElement;
    const computedStyle = getComputedStyle(root);
    const delayFactor = parseFloat(computedStyle.getPropertyValue('--animation-delay-factor')) || 0.05;
    
    // If timestamp is provided, use it to determine base position in cycle
    const basePosition = timestamp ? ((timestamp % 1000) / 1000) : 0;
    
    // Calculate position in the animation based on index and base position
    const position = (basePosition + index * delayFactor) % 1; // Normalize to 0-1 range
    
    // Find the closest color based on position in animation cycle
    const position12 = position * 12; // Scale to 0-12 range for our 12 colors
    const lowerIndex = Math.floor(position12);
    const upperIndex = Math.ceil(position12) % colors.length;
    const blend = position12 - lowerIndex;
    
    // Simple color interpolation
    return blend < 0.5 ? colors[lowerIndex] : colors[upperIndex];
  }
  
  // Function to apply animation speed based on settings
  function applyAnimationSpeed(speed) {
    const root = document.documentElement;
    const speedValue = animationSpeeds[speed] || animationSpeeds.medium;
    
    // Set CSS variables
    root.style.setProperty('--animation-speed', `${speedValue}s`);
    
    // Adjust delay factor based on speed (shorter delay for faster animation)
    const delayFactor = speedValue === 6 ? 0.08 : speedValue === 3 ? 0.05 : 0.02;
    root.style.setProperty('--animation-delay-factor', `${delayFactor}s`);
    
    // Restart all animations to keep them in sync
    restartAllAnimations();
    
    // No need to send individual messages here since restartAllAnimations now handles broadcasting
  }
  
  // Initialize main UI first for faster rendering
  function initMainUI() {
    // Initialize site buttons
    initSiteButtons();
    
    // Load saved settings or use defaults
    safelyExecuteChromeAPI(() => {
      chrome.storage.local.get(['settings', 'refreshNeeded'], function(result) {
        try {
          const settings = result.settings || defaultSettings;
          
          // Get the refresh needed state from storage
          refreshNeeded = result.refreshNeeded || false;
          
          updateUI(settings);
          
          // Add event listeners after UI is rendered
          setupEventListeners(settings);
          
          // Start periodic refresh status check
          startRefreshStatusCheck();
          
          // Load recent addresses after UI is set up
          loadRecentAddresses();
        } catch (error) {
          console.warn('Error in main UI initialization:', error);
        }
      });
    });
  }
  
  // Start periodic refresh status check
  function startRefreshStatusCheck() {
    // Check refresh status every 1 second
    setInterval(checkRefreshStatus, 1000);
  }
  
  // Check for refresh status changes
  function checkRefreshStatus() {
    chrome.storage.local.get(['refreshNeeded'], function(result) {
      if (refreshNeeded !== result.refreshNeeded) {
        console.log('Refresh status changed:', refreshNeeded, '->', result.refreshNeeded);
        refreshNeeded = result.refreshNeeded;
        
        // Update UI based on the new refresh status
        chrome.storage.local.get(['settings'], function(data) {
          updateUI(data.settings || defaultSettings);
        });
      }
    });
  }
  
  // Initialize site buttons
  function initSiteButtons() {
    // Get all site button wrappers
    const siteButtonWrappers = document.querySelectorAll('.site-button-group .button-wrapper');
    
    siteButtonWrappers.forEach((wrapper, index) => {
      // Get the actual site button inside the wrapper
      const button = wrapper.querySelector('.site-button');
      
      wrapper.addEventListener('click', function() {
        // Remove active class from all buttons
        siteButtons.forEach(btn => {
          btn.classList.remove('active');
          // Reset styles for all buttons
          btn.style.animation = '';
          btn.style.backgroundColor = '';
          btn.style.borderColor = '';
        });
        
        // Add active class to clicked button
        button.classList.add('active');
        
        // Get site value and name from the button
        const value = button.getAttribute('data-value');
        const siteName = button.getAttribute('data-name');
        
        // Apply appropriate styles based on wave/static mode
        chrome.storage.local.get('settings', function(data) {
          const settings = data.settings || defaultSettings;
          
          if (!settings.waveEffect) {
            // Static mode - use the selected color
            button.style.animation = 'none';
            button.style.backgroundColor = hexToRgba(settings.staticColor, 0.2);
            button.style.borderColor = settings.staticColor;
          } else {
            // Wave mode - use the animation
            button.style.animation = '';
            button.style.backgroundColor = '';
            button.style.borderColor = '';
          }
        });
        
        // Update site labels visibility
        document.querySelectorAll('.site-name-label').forEach(label => {
          label.style.display = 'none';
        });
        
        // Show only the selected site's label
        const selectedLabel = document.getElementById(`${value}-label`);
        if (selectedLabel) {
          selectedLabel.style.display = 'block';
        }
        
        // Update hidden select
        tradingSiteSelect.value = value;
        
        // Trigger change event on select
        const event = new Event('change', { bubbles: true });
        tradingSiteSelect.dispatchEvent(event);
      });
    });
  }
  
  // Update the handleEffectToggle function to always restart animations
  function handleEffectToggle(settings) {
    try {
      // Update settings based on current state
      if (settings.waveEffect) {
        // Currently in WAVE mode, toggle to FAST mode
        if (settings.fastMode) {
          // Currently in FAST mode, toggle to STATIC mode
          settings.waveEffect = false;
          settings.fastMode = false;
        } else {
          // Currently in WAVE mode, toggle to FAST mode
          settings.fastMode = true;
        }
      } else {
        // Currently in STATIC mode, toggle to WAVE mode
        settings.waveEffect = true;
        settings.fastMode = false;
      }

      // Update UI based on new settings
      updateUI(settings);
      
      // Always restart animations when effect changes to ensure synchronization
      restartAllAnimations();
      
      // Send message to background script to update content scripts
      chrome.runtime.sendMessage({
        action: 'updateEffectType',
        waveEffect: settings.waveEffect,
        staticColor: settings.staticColor,
        fastMode: settings.fastMode
      });

      // Mark for refresh to ensure content scripts are updated
      refreshNeeded = true;
      showRefreshNotification();
      
      // Save the settings
      saveSettings(settings);
    } catch (error) {
      console.error('Error toggling effect state:', error);
    }
  }
  
  // Helper function to handle ON/OFF toggle
  function handleOnOffToggle(settings) {
    try {
      console.log('ON/OFF button clicked, current state:', settings.extensionActive);
      
      // Toggle extension active state
      settings.extensionActive = !settings.extensionActive;
      isExtensionActive = settings.extensionActive;
      
      // Update UI based on new settings
      updateUI(settings);
      
      // If turning on and wave effect is enabled, restart animations for sync
      if (settings.extensionActive && settings.waveEffect) {
        restartAllAnimations();
      }
      
      // Save the settings
      saveSettings(settings);
    } catch (error) {
      console.error('Error toggling ON/OFF state:', error);
    }
  }
  
  // Update the handleSpeedChange function to properly restart animations
  function handleSpeedChange(speed, settings) {
    try {
      // Update animation speed
      settings.animationSpeed = speed;
      applyAnimationSpeed(speed);
      
      // Always restart animations when speed changes to ensure synchronization
      restartAllAnimations();
      
      // Save new settings
      saveSettings(settings);
    } catch (error) {
      console.error('Error changing animation speed:', error);
    }
  }
  
  // Function to set up event listeners for settings changes
  function setupEventListeners(settings) {
    try {
      // Setup effect toggle (WAVE/FAST/STATIC)
      const effectIndicator = document.getElementById('effect-indicator');
      const effectWrapper = document.querySelector('#effect-indicator-wrapper');
      
      if (effectWrapper) {
        effectWrapper.addEventListener('click', function(event) {
          handleEffectToggle(settings);
          event.stopPropagation(); // Prevent bubbling
        });
      }
      
      if (effectIndicator) {
        effectIndicator.addEventListener('click', function(event) {
          handleEffectToggle(settings);
          event.stopPropagation(); // Prevent bubbling
        });
      }
      
      // Setup on/off toggle
      const statusIndicator = document.getElementById('status-indicator');
      const statusWrapper = document.querySelector('#status-indicator-wrapper');
      
      if (statusWrapper) {
        statusWrapper.addEventListener('click', function(event) {
          handleOnOffToggle(settings);
          event.stopPropagation(); // Prevent bubbling
        });
      }
      
      if (statusIndicator) {
        statusIndicator.addEventListener('click', function(event) {
          handleOnOffToggle(settings);
          event.stopPropagation(); // Prevent bubbling
        });
      }

      // Setup speed option buttons if they exist (for backward compatibility)
      document.querySelectorAll('.speed-option-wrapper').forEach(wrapper => {
        wrapper.addEventListener('click', function(event) {
          const speedOption = this.querySelector('.speed-option');
          if (speedOption) {
            const speed = parseInt(speedOption.getAttribute('data-speed'));
            if (!isNaN(speed)) {
              // Set active class on clicked option only
              document.querySelectorAll('.speed-option').forEach(option => {
                option.classList.remove('active');
              });
              speedOption.classList.add('active');
              
              // Update speed and restart animations
              handleSpeedChange(speed, settings);
            }
          }
          event.stopPropagation(); // Prevent bubbling
        });
      });
      
      // Static color picker
      staticColorPicker.addEventListener('input', function() {
        const newColor = this.value;
        settings.staticColor = newColor;
        
        // Only update if in static mode
        if (!settings.waveEffect) {
          // Apply direct color changes to all necessary elements
          
          // Update STATIC button directly
          const effectBtn = document.getElementById('effect-indicator');
          if (effectBtn) {
            effectBtn.style.backgroundColor = hexToRgba(newColor, 0.2);
            effectBtn.style.color = newColor;
            effectBtn.style.borderColor = newColor;
          }
          
          // Update title text spans
          const titleEl = document.getElementById('title-text');
          if (titleEl) {
            // First, ensure title has the correct structure for static mode
            if (!titleEl.querySelector('.static-char')) {
              // Rebuild the title with static spans if needed
              titleEl.innerHTML = '';
              const titleText = 'Can Opener';
              [...titleText].forEach(char => {
                const span = document.createElement('span');
                span.textContent = char;
                span.className = char === ' ' ? 'static-char space-char' : 'static-char';
                span.style.color = newColor;
                titleEl.appendChild(span);
              });
            } else {
              // Update existing static spans
              titleEl.querySelectorAll('.static-char').forEach(span => {
                span.style.color = newColor;
              });
            }
          }
          
          // Update site buttons
          document.querySelectorAll('.site-button.active').forEach(btn => {
            btn.style.backgroundColor = hexToRgba(newColor, 0.2);
            btn.style.borderColor = newColor;
          });
          
          // Update token names
          document.querySelectorAll('.token-name:not(.chroma-wave)').forEach(tokenName => {
            tokenName.style.color = newColor;
          });
          
          document.querySelectorAll('.token-name .static-char').forEach(span => {
            span.style.color = newColor;
          });
        }
        
        // Save the new settings
        saveSettings(settings);
      });
      
      // Trading site selector
      tradingSiteSelect.addEventListener('change', function() {
        settings.tradingSite = this.value;
        saveSettings(settings);
      });
    } catch (error) {
      console.error('Error setting up event listeners:', error);
    }
  }
  
  // Function to update token names in the history section with current settings
  function updateHistoryTokenNames(settings) {
    // For static mode, update the color of all token names
    if (!settings.waveEffect) {
      const currentColor = settings.staticColor;
      
      // Update regular token names
      document.querySelectorAll('.token-name:not(.chroma-wave)').forEach(tokenName => {
        tokenName.style.color = currentColor;
      });
      
      // Update any static-char spans within token names
      document.querySelectorAll('.token-name .static-char').forEach(span => {
        span.style.color = currentColor;
      });
    }
    
    // For a more complete update, reload the entire history section
    loadRecentAddresses();
  }
  
  // Function to update the effect indicator based on settings
  function updateEffectIndicator(settings) {
    try {
      const effectIndicator = document.getElementById('effect-indicator');
      if (!effectIndicator) return;
      
      // Clear existing classes
      effectIndicator.classList.remove('wave-active', 'static-active', 'fast-mode');
      
      // Handle element's child span content for accessibility
      let spanElement = effectIndicator.querySelector('span');
      if (!spanElement) {
        spanElement = document.createElement('span');
        effectIndicator.innerHTML = '';
        effectIndicator.appendChild(spanElement);
      }
      
      // Set class and text based on current mode
      if (settings.waveEffect) {
        if (settings.fastMode) {
          // Fast mode
          spanElement.textContent = 'FAST';
          effectIndicator.classList.add('fast-mode');
        } else {
          // Regular wave mode
          spanElement.textContent = 'WAVE';
          effectIndicator.classList.add('wave-active');
        }
        
        // When applying wave/fast effect, always ensure animations are restarted/synced
        setTimeout(() => restartAllAnimations(), 10);
      } else {
        // Static mode
        spanElement.textContent = 'STATIC';
        effectIndicator.classList.add('static-active');
        effectIndicator.style.backgroundColor = hexToRgba(settings.staticColor, 0.2);
        effectIndicator.style.color = settings.staticColor;
        effectIndicator.style.borderColor = settings.staticColor;
      }
      
      // Add clickable class
      effectIndicator.classList.add('clickable');
      
      // Grey out if extension is inactive
      if (!settings.extensionActive) {
        effectIndicator.classList.add('greyed-out');
      } else {
        effectIndicator.classList.remove('greyed-out');
      }
    } catch (error) {
      console.warn('Error updating effect indicator:', error);
    }
  }
  
  // Helper function to convert hex color to rgba
  function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  
  // Trading site URL patterns
  const siteUrlPatterns = {
    axiom: 'https://axiom.trade/t/[CONTRACT_ADDRESS]/@ref',
    bullx: 'https://neo.bullx.io/terminal?chainId=1399811149&address=[CONTRACT_ADDRESS]',
    photon: 'https://photon-sol.tinyastro.io/en/lp/[CONTRACT_ADDRESS]?handle=25040352b7652e422e0dee',
    gmgn: 'https://gmgn.ai/sol/token/[CONTRACT_ADDRESS]',
    dexscreener: 'https://dexscreener.com/solana/[CONTRACT_ADDRESS]',
    birdeye: 'https://www.birdeye.so/token/[CONTRACT_ADDRESS]?chain=solana'
  };
  
  // Function to perform a "soft refresh" without reloading the page
  function softRefresh() {
    console.log("Performing soft refresh");
    
    // Reset refresh status
    refreshNeeded = false;
    
    // Get current settings
    chrome.storage.local.get('settings', function(data) {
      const settings = data.settings || defaultSettings;
      
      // Reset the status banner first
      resetStatusBanner();
      
      // Apply current settings to UI with a slight delay to ensure clean state
      setTimeout(function() {
        // This will handle all UI updates including site button selection
        updateUI(settings);
        
        // If wave effect is enabled, restart animations
        if (settings.waveEffect) {
          restartAllAnimations();
        }
        
        // Load recent addresses
        loadRecentAddresses();
      }, 50);
    });
  }
  
  // Function to check if the current tab is on Discord.com
  function checkIfDiscord(callback) {
    safelyExecuteChromeAPI(() => {
      chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        try {
          if (chrome.runtime.lastError) {
            console.warn('Error querying tabs:', chrome.runtime.lastError.message);
            callback(false);
            return;
          }
          
          if (tabs && tabs.length > 0 && tabs[0].url) {
            const url = new URL(tabs[0].url);
            const isDiscord = url.hostname.includes('discord.com');
            callback(isDiscord);
          } else {
            callback(false);
          }
        } catch (error) {
          console.warn('Error in checkIfDiscord:', error);
          callback(false);
        }
      });
    }, () => callback(false));
  }
  
  // Function to show refresh notification
  function showRefreshNotification() {
    // Show refresh notification regardless of extension state
    refreshNeeded = true;
    statusBanner.classList.remove('ready', 'inactive');
    statusBanner.classList.add('refresh-required');
    
    // Check if the current tab is Discord.com
    checkIfDiscord(isDiscord => {
      if (isDiscord) {
        // Discord-specific behavior - non-clickable banner
        statusMessage.innerHTML = 'Refresh Required<br><span class="discord-note">This may take a moment on discord.com.</span>';
        
        // Add Discord-specific class
        statusBanner.classList.add('discord-refresh');
        
        // Remove click handler for Discord
        statusBanner.onclick = null;
      } else {
        // Normal behavior for all other sites
        statusMessage.textContent = 'Click to Refresh';
        
        // Ensure Discord class is removed if it was previously added
        statusBanner.classList.remove('discord-refresh');
        
        // Banner is now styled with CSS for hover/active effects
        statusBanner.onclick = function() {
          // Change message to indicate refreshing is in progress
          statusMessage.textContent = 'Refreshing...';
          
          // Add a temporary class to disable hover effects during refresh
          statusBanner.classList.add('refreshing');
          
          // Send a message to the background script to refresh all tabs with the extension active
          safelyExecuteChromeAPI(() => {
            chrome.runtime.sendMessage({ action: 'refreshTabs' }, function(response) {
              try {
                // Check for runtime error first
                if (chrome.runtime.lastError) {
                  console.log("Error refreshing tabs:", chrome.runtime.lastError.message);
                  // Reset banner after a short delay
                  setTimeout(resetStatusBanner, 2000);
                  return;
                }
                
                if (response && response.success) {
                  console.log('Tabs refreshed successfully');
                  
                  // First save the refresh state to false so it doesn't show refresh banner again
                  safelyExecuteChromeAPI(() => {
                    chrome.storage.local.set({ refreshNeeded: false }, function() {
                      try {
                        // Perform a soft refresh instead of a full page reload
                        softRefresh();
                      } catch (error) {
                        console.warn('Error in softRefresh:', error);
                        // Reset banner after a short delay as a fallback
                        setTimeout(resetStatusBanner, 2000);
                      }
                    });
                  });
                }
              } catch (error) {
                console.warn('Error in refresh response handler:', error);
                // Reset banner after a short delay as a fallback
                setTimeout(resetStatusBanner, 2000);
              }
            });
          });
        };
      }
    });
    
    // Clear any animation styles and set appropriate colors
    statusBanner.style.animation = '';
    statusBanner.style.animationDelay = '';
    statusBanner.style.borderColor = '#ffa500';
    statusBanner.style.color = '#ffa500';
    statusBanner.style.backgroundColor = 'rgba(255, 165, 0, 0.2)';
    
    // Clear GPU acceleration styles
    statusBanner.style.webkitFontSmoothing = '';
    statusBanner.style.mozOsxFontSmoothing = '';
    statusBanner.style.backfaceVisibility = '';
    statusBanner.style.transform = '';
    statusBanner.style.willChange = '';
    
    // Save the refresh needed state to storage
    safelyExecuteChromeAPI(() => {
      chrome.storage.local.set({ refreshNeeded: true });
    });
  }
  
  // Function to reset status banner to "Active"
  function resetStatusBanner() {
    refreshNeeded = false;
    statusBanner.classList.remove('refresh-required', 'inactive', 'refreshing', 'discord-refresh');
    statusBanner.classList.add('ready');
    statusMessage.textContent = 'Active';
    
    // Use original green color, not rainbow animation
    statusBanner.style.animation = '';
    statusBanner.style.animationDelay = '';
    statusBanner.style.borderColor = '#00cc00';
    statusBanner.style.color = '#00cc00';
    statusBanner.style.backgroundColor = 'rgba(0, 255, 0, 0.1)';
    
    // Remove GPU acceleration styles since we're not animating
    statusBanner.style.webkitFontSmoothing = '';
    statusBanner.style.mozOsxFontSmoothing = '';
    statusBanner.style.backfaceVisibility = '';
    statusBanner.style.transform = '';
    statusBanner.style.willChange = '';
    
    // Remove click handler
    statusBanner.onclick = null;
    
    // Reset the refresh needed state in storage
    chrome.storage.local.set({ refreshNeeded: false });
  }
  
  // Function to set status banner to "Inactive"
  function setInactiveBanner() {
    statusBanner.classList.remove('ready', 'refresh-required', 'discord-refresh');
    statusBanner.classList.add('inactive');
    statusMessage.textContent = 'Inactive';
    
    // Clear any animation styles
    statusBanner.style.animation = '';
    statusBanner.style.animationDelay = '';
    statusBanner.style.borderColor = '#ff0000';
    statusBanner.style.color = '#ff0000';
    statusBanner.style.backgroundColor = 'rgba(255, 0, 0, 0.1)';
  }
  
  // Function to update UI based on settings
  function updateUI(settings) {
    try {
      const statusIndicator = document.getElementById('status-indicator');
      const effectIndicator = document.getElementById('effect-indicator');
      const titleText = document.getElementById('title-text');
      const colorPickerContainer = document.getElementById('color-picker-container');
      const statusBanner = document.querySelector('.status-banner');
      
      if (!statusIndicator || !effectIndicator || !titleText) {
        console.warn('Missing critical UI elements');
        return;
      }
      
      // Update global state variables
      isExtensionActive = settings.extensionActive;
      isWaveEffect = settings.waveEffect;
      isFastMode = settings.fastMode;
      
      // --------------------------------
      // Update ON/OFF button state
      // --------------------------------
      const statusSpan = statusIndicator.querySelector('span') || document.createElement('span');
      if (!statusIndicator.contains(statusSpan)) {
        statusIndicator.appendChild(statusSpan);
      }
      
      if (settings.extensionActive) {
        // ON state
        statusSpan.textContent = 'ON';
        statusIndicator.classList.remove('inactive');
        statusIndicator.classList.add('active', 'clickable');
        
        // Remove greyed-out from all UI elements
        document.querySelectorAll('.greyed-out').forEach(element => {
          element.classList.remove('greyed-out');
        });
        
        // Reset status banner if needed
        if (statusBanner) {
          resetStatusBanner();
        }
      } else {
        // OFF state
        statusSpan.textContent = 'OFF';
        statusIndicator.classList.remove('active');
        statusIndicator.classList.add('inactive', 'clickable');
        
        // Add greyed-out to all UI elements that should be disabled
        const elementsToGrey = [
          effectIndicator,
          titleText,
          document.getElementById('speed-selector-container'),
          document.getElementById('color-picker-container'),
          document.querySelector('.recent-section'),
          ...document.querySelectorAll('.site-button-group'),
          ...document.querySelectorAll('.site-button.active'),
          ...document.querySelectorAll('.speed-option'),
          ...document.querySelectorAll('.token-name')
        ];
        
        elementsToGrey.forEach(element => {
          if (element) element.classList.add('greyed-out');
        });
        
        // Set inactive banner
        if (statusBanner) {
          setInactiveBanner();
        }
      }
      
      // --------------------------------
      // Update the effect indicator (WAVE/FAST/STATIC)
      // --------------------------------
      updateEffectIndicator(settings);
      
      // --------------------------------
      // Update title text animation
      // --------------------------------
      // Clear any existing content
      titleText.innerHTML = '';
      
      // Set appropriate class
      titleText.className = settings.waveEffect ? 'wave-text' : '';
      
      if (!settings.extensionActive) {
        titleText.classList.add('greyed-out');
      }
      
      // Create appropriate spans for the title
      const titleString = 'Can Opener';
      
      if (settings.waveEffect) {
        // Create animation for each character
        [...titleString].forEach((char, index) => {
          const span = document.createElement('span');
          span.textContent = char;
          span.className = char === ' ' ? 'chroma-char space-char' : 'chroma-char';
          span.style.setProperty('--char-index', index);
          
          // Set initial color to avoid white flash
          const initialColor = getColorForIndex(index);
          span.style.color = initialColor;
          
          if (!settings.extensionActive) {
            span.classList.add('greyed-out');
            span.style.color = '#888';
          }
          
          titleText.appendChild(span);
        });
      } else {
        // Create static colored text
        [...titleString].forEach(char => {
          const span = document.createElement('span');
          span.textContent = char;
          span.className = char === ' ' ? 'static-char space-char' : 'static-char';
          span.style.color = settings.staticColor;
          
          if (!settings.extensionActive) {
            span.classList.add('greyed-out');
            span.style.color = '#888';
          }
          
          titleText.appendChild(span);
        });
      }
      
      // --------------------------------
      // Update color picker visibility
      // --------------------------------
      if (colorPickerContainer) {
        colorPickerContainer.style.display = settings.waveEffect ? 'none' : 'flex';
        
        // Update the color picker value
        const staticColorPicker = document.getElementById('static-color');
        if (staticColorPicker) {
          staticColorPicker.value = settings.staticColor;
        }
      }
      
      // --------------------------------
      // Update speed selector based on settings
      // --------------------------------
      const speedOptions = document.querySelectorAll('.speed-option');
      if (speedOptions.length > 0) {
        speedOptions.forEach(option => {
          const speed = parseInt(option.getAttribute('data-speed'));
          if (speed === settings.animationSpeed) {
            option.classList.add('active');
          } else {
            option.classList.remove('active');
          }
        });
      }
      
      // --------------------------------
      // Update site buttons
      // --------------------------------
      // First, remove active class from all site buttons
      document.querySelectorAll('.site-button').forEach(btn => {
        btn.classList.remove('active');
        // Clear any existing styles
        btn.style.animation = '';
        btn.style.backgroundColor = '';
        btn.style.borderColor = '';
      });

      // Get the button corresponding to the current trading site and make it active
      const currentSiteButton = document.querySelector(`.site-button[data-value="${settings.tradingSite}"]`);
      if (currentSiteButton) {
        currentSiteButton.classList.add('active');
        
        // Apply appropriate styling based on effect mode
        if (settings.waveEffect) {
          // Wave effect
          currentSiteButton.style.animation = '';
          currentSiteButton.style.backgroundColor = '';
          currentSiteButton.style.borderColor = '';
        } else {
          // Static color
          currentSiteButton.style.animation = 'none';
          currentSiteButton.style.backgroundColor = hexToRgba(settings.staticColor, 0.2);
          currentSiteButton.style.borderColor = settings.staticColor;
        }
        
        if (!settings.extensionActive) {
          currentSiteButton.classList.add('greyed-out');
        }
        
        // Update site labels visibility
        document.querySelectorAll('.site-name-label').forEach(label => {
          label.style.display = 'none';
        });
        
        // Show only the selected site's label
        const selectedLabel = document.getElementById(`${settings.tradingSite}-label`);
        if (selectedLabel) {
          selectedLabel.style.display = 'block';
        }
      }
      
      // --------------------------------
      // Update history item colors
      // --------------------------------
      updateHistoryTokenNames(settings);
      
      // --------------------------------
      // Apply current animation speed
      // --------------------------------
      if (settings.waveEffect && settings.fastMode) {
        // Force fast speed when in FAST mode
        applyAnimationSpeed('fast');
      } else {
        // Use normal speed setting otherwise
        applyAnimationSpeed(settings.animationSpeed);
      }
      
      // If the extension is active and wave effect is enabled, restart all animations to ensure synchronization
      if (settings.extensionActive && settings.waveEffect) {
        restartAllAnimations();
      }
      
    } catch (error) {
      console.error('Error updating UI:', error);
    }
  }
  
  // Function to save settings
  function saveSettings(settings) {
    safelyExecuteChromeAPI(() => {
    chrome.storage.local.set({ settings: settings }, function() {
        try {
          // Check if this is just a color change in static mode
          const isJustColorChange = settings.waveEffect === false && 
                                   document.activeElement === staticColorPicker;
          
          if (!isJustColorChange) {
            // For other changes, update the full UI
            updateUI(settings);
          }
          
          // Always show refresh notification regardless of extension state
          showRefreshNotification();
          
          // If wave effect is enabled, restart animations to ensure sync
          if (settings.waveEffect) {
            restartAllAnimations();
          }
          
          // Force redraw if switching to ON state to ensure all elements reset properly
          if (settings.extensionActive) {
            setTimeout(forceRedraw, 10);
          }
        } catch (error) {
          console.warn('Error in settings callback:', error);
        }
      });
    });
  }
  
  // Helper function to force a complete redraw of problematic elements
  function forceRedraw() {
    try {
      // Force redraw of speed options (most problematic)
      document.querySelectorAll('.speed-option').forEach(option => {
        // This forces a browser reflow/repaint
        option.style.display = 'none';
        void option.offsetWidth; // Trigger reflow
        option.style.display = '';
      });
      
      // Force redraw of button wrappers
      document.querySelectorAll('.button-wrapper').forEach(wrapper => {
        wrapper.style.display = 'none';
        void wrapper.offsetWidth; // Trigger reflow
        wrapper.style.display = '';
      });
      
      // Re-add active class to correct speed option
      safelyExecuteChromeAPI(() => {
        chrome.storage.local.get('settings', function(data) {
          try {
            const settings = data.settings || defaultSettings;
            
            // Update speed selector UI
            document.querySelectorAll('.speed-option').forEach(option => {
              if (option.getAttribute('data-speed') === settings.animationSpeed) {
                option.classList.add('active');
              } else {
                option.classList.remove('active');
              }
            });
          } catch (error) {
            console.warn('Error in forceRedraw callback:', error);
          }
        });
      });
    } catch (error) {
      console.warn('Error in forceRedraw:', error);
    }
  }
  
  // Function to build URL for the selected trading site
  function buildTradingSiteUrl(address, site) {
    const pattern = siteUrlPatterns[site] || siteUrlPatterns.axiom;
    return pattern.replace('[CONTRACT_ADDRESS]', address);
  }
  
  // Format timestamp to relative time (e.g., "2 minutes ago")
  const formatRelativeTime = (timestamp) => {
    const now = Date.now();
    const diff = now - timestamp;
    
    // Convert to seconds
    const seconds = Math.floor(diff / 1000);
    
    if (seconds < 60) {
      return 'just now';
    }
    
    // Convert to minutes
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    }
    
    // Convert to hours
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    }
    
    // Convert to days
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  };
  
  // Function to add wave effect to an element
  function applyWaveEffect(element, text, settings) {
    if (!element) return;
    
    // Clear the element
    element.innerHTML = '';
    
    // Add chroma-wave class for styling
    element.classList.add('chroma-wave', 'wave-text');
    
    // Create span for each character
    [...text].forEach((char, index) => {
      const span = document.createElement('span');
      span.textContent = char;
      span.className = char === ' ' ? 'chroma-char space-char' : 'chroma-char';
      span.style.setProperty('--char-index', index);
      
      // Set initial color to avoid white flash
      const initialColor = getColorForIndex(index);
      span.style.color = initialColor;
      
      element.appendChild(span);
    });
  }
  
  // Modified function to build token info with proper wave effect
  function buildTokenInfo(item, settings) {
    // Create a container for token info
    const tokenContainer = document.createElement('div');
    tokenContainer.className = 'token-container';
    
    // Add token logo if available
    if (item.tokenMetadata && item.tokenMetadata.logoURI) {
      const tokenLogo = document.createElement('img');
      tokenLogo.src = item.tokenMetadata.logoURI;
      tokenLogo.className = 'token-logo';
      tokenLogo.onerror = function() {
        // If logo fails to load, hide it
        this.style.display = 'none';
      };
      tokenContainer.appendChild(tokenLogo);
    } else {
      // Create placeholder logo
      const placeholderLogo = document.createElement('div');
      placeholderLogo.className = 'token-logo-placeholder';
      placeholderLogo.textContent = (item.tokenMetadata && item.tokenMetadata.symbol) 
        ? item.tokenMetadata.symbol.charAt(0) 
        : '?';
      tokenContainer.appendChild(placeholderLogo);
    }
    
    // Create token info container
    const tokenInfo = document.createElement('div');
    tokenInfo.className = 'token-info';
    
    // Add token name and symbol
    if (item.tokenMetadata && (item.tokenMetadata.name !== 'Unknown Token' || item.tokenMetadata.symbol !== '???')) {
      // Token name - dynamic based on wave effect setting
      const tokenName = document.createElement('div');
      tokenName.className = 'token-name';
      
      if (settings.waveEffect) {
        // Apply wave effect properly
        applyWaveEffect(tokenName, item.tokenMetadata.name, settings);
      } else {
        // Static color mode
        tokenName.textContent = item.tokenMetadata.name;
        tokenName.style.color = settings.staticColor;
      }
      
      tokenInfo.appendChild(tokenName);
      
      // Token symbol (no animation)
      const tokenSymbol = document.createElement('div');
      tokenSymbol.className = 'token-symbol';
      tokenSymbol.textContent = item.tokenMetadata.symbol;
      tokenInfo.appendChild(tokenSymbol);
    } else {
      // Display "Unknown Token" for unrecognized tokens
      const tokenName = document.createElement('div');
      tokenName.className = 'token-name';
      tokenName.textContent = 'Unknown Token';
      tokenInfo.appendChild(tokenName);
    }
    
    tokenContainer.appendChild(tokenInfo);
    return tokenContainer;
  }
  
  function loadRecentAddresses() {
    chrome.storage.local.get(['recentAddresses', 'settings'], function(data) {
      const recentAddressesList = document.getElementById('recent-addresses-list');
      if (!recentAddressesList) return;
      
      recentAddressesList.innerHTML = '';
      
      const recentAddresses = data.recentAddresses || [];
      const settings = data.settings || defaultSettings;
      
      if (recentAddresses.length === 0) {
        const emptyState = document.createElement('div');
        emptyState.className = 'empty-state';
        emptyState.textContent = 'No addresses viewed yet';
        recentAddressesList.appendChild(emptyState);
        return;
      }
      
      recentAddresses.forEach(item => {
        const addressItem = document.createElement('div');
        addressItem.className = 'address-item';
        
        const addressLink = document.createElement('a');
        addressLink.className = 'address-link';
        addressLink.href = item.url || '#';
        
        // Add token container with improved wave effect
        const tokenContainer = buildTokenInfo(item, settings);
        addressLink.appendChild(tokenContainer);
        
        // Add the address text with proper truncation
        if (item.address) {
          const addressHint = document.createElement('div');
          addressHint.className = 'address-hint';
          
          // Format address nicely (truncate middle)
          const formattedAddress = `${item.address.substring(0, 8)}...${item.address.substring(item.address.length - 8)}`;
          addressHint.textContent = formattedAddress;
          addressLink.appendChild(addressHint);
        }
        
        // Add page title if available
        if (item.pageTitle) {
          const pageTitle = document.createElement('div');
          pageTitle.className = 'page-title';
          pageTitle.textContent = item.pageTitle;
          addressLink.appendChild(pageTitle);
        }
        
        addressItem.appendChild(addressLink);
        
        // Add timestamp
        const timestamp = document.createElement('div');
        timestamp.className = 'timestamp';
        timestamp.textContent = formatRelativeTime(item.timestamp);
        addressItem.appendChild(timestamp);
        
        // Add click handler to open the URL since we disabled pointer-events on the inner link
        addressItem.addEventListener('click', function() {
          window.open(addressLink.href, '_blank');
        });
        
        recentAddressesList.appendChild(addressItem);
      });
      
      // Apply greyed-out styling if extension is inactive
      if (!isExtensionActive) {
        recentAddressesList.querySelectorAll('.chroma-char').forEach(span => {
          span.classList.add('greyed-out');
          span.style.animation = 'none';
          span.style.opacity = '0.4';
          span.style.filter = 'grayscale(70%)';
          span.style.color = '#888';
        });
      }
    });
  }
  
  // Start initializing the UI
  initMainUI();
}); 