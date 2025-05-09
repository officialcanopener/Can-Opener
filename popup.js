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
  
  // Flag to track if settings have been changed and a refresh is needed
  let refreshNeeded = false;
  
  // Site buttons elements
  const siteButtons = document.querySelectorAll('.site-button');
  
  // Default settings
  const defaultSettings = {
    extensionActive: true,
    effectState: 'wave', // Changed from waveEffect boolean to effectState string with three values: 'wave', 'fast', 'static'
    staticColor: '#8C00FF',
    tradingSite: 'axiom'
    // Removed animationSpeed as it's now included in effectState
  };
  
  // Animation speed values in seconds
  const animationSpeeds = {
    wave: 6,  // Former 'slow' speed for normal WAVE
    fast: 1,  // Former 'fast' speed for FAST state
    static: 0 // Not used for animation, just a placeholder
  };
  
  // Effect states cycle
  const effectStates = ['wave', 'fast', 'static'];
  
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
      // Generate a random negative value for animation-restart
      // This forces a complete animation restart by temporarily removing and re-adding animation
      const timestamp = Date.now();
      const root = document.documentElement;
      
      // Step 1: Set the restart variable
      root.style.setProperty('--animation-restart', `-${timestamp % 1000}ms`);
      
      // Step 2: Force a style recalculation to ensure the animations restart
      root.classList.add('force-animation-restart');
      
      // Step 3: Force the browser to process the changes before removing the class
      void root.offsetWidth;
      
      // Step 4: Remove the class
      root.classList.remove('force-animation-restart');
      
      // Step 5: Check if we need to reapply the title animation
      const titleElement = document.getElementById('title-text');
      if (titleElement && titleElement.classList.contains('wave-text')) {
        // Re-apply wave effect to ensure synchronization
        safelyExecuteChromeAPI(() => {
          chrome.storage.local.get('settings', function(data) {
            try {
              const settings = data.settings || defaultSettings;
              if (settings.effectState === 'wave' || settings.effectState === 'fast') {
                // Only reapply if still in wave mode
                updateEffectIndicator(settings);
              }
            } catch (error) {
              console.warn('Error in animation settings callback:', error);
            }
          });
        });
      }
      
      // Step 6: Broadcast restart message safely to content scripts
      broadcastToAllTabs({
        action: 'restartAnimation',
        restartTimestamp: timestamp
      });
    } catch (error) {
      console.warn('Error in restartAllAnimations:', error);
    }
  }
  
  // Function to apply animation speed based on the setting
  function applyAnimationSpeed(speedSetting) {
    // Update CSS variables for animation speed
    const root = document.documentElement;
    const speedValue = animationSpeeds[speedSetting] || animationSpeeds.wave;
    
    // Calculate delay factor based on speed
    const delayFactor = speedValue === 6 ? 0.08 : 0.02; // Higher for slower, lower for faster
    
    // Set CSS variables
    root.style.setProperty('--animation-speed', `${speedValue}s`);
    root.style.setProperty('--animation-delay-factor', `${delayFactor}s`);
    
    safelyExecuteChromeAPI(() => {
      // Send message to all tabs to update animation speed
      chrome.tabs.query({}, function(tabs) {
        tabs.forEach(tab => {
          try {
            chrome.tabs.sendMessage(tab.id, {
              action: 'updateAnimationSpeed',
              speedSetting: speedSetting
            });
          } catch (error) {
            console.warn(`Error sending message to tab ${tab.id}:`, error);
          }
        });
      });
    });
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
          
          if (settings.effectState !== 'wave' && settings.effectState !== 'fast') {
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
  
  // Set up event listeners for settings changes
  function setupEventListeners(settings) {
    // Find the ON/OFF button wrapper more reliably
    const statusWrapper = document.querySelector('.toggle-container:nth-child(2) .button-wrapper');
    
    if (statusWrapper) {
      statusWrapper.addEventListener('click', function() {
        console.log('ON/OFF button clicked, current state:', settings.extensionActive);
        
        // Toggle extension active state
        settings.extensionActive = !settings.extensionActive;
        isExtensionActive = settings.extensionActive;
        
        // Update the UI immediately for responsive feel
        if (settings.extensionActive) {
          // ON state
          statusIndicator.textContent = 'ON';
          statusIndicator.classList.remove('inactive');
          statusIndicator.classList.add('active');
          statusIndicator.style.backgroundColor = 'rgba(0, 204, 0, 0.2)';
          statusIndicator.style.color = '#00cc00';
          statusIndicator.style.borderColor = '#00cc00';
          
          // COMPLETE RESET: Remove greyed-out styling from all UI elements
          
          // Reset effect indicator
          effectIndicator.classList.remove('greyed-out');
          effectIndicator.style.opacity = '';
          effectIndicator.style.filter = '';
          effectIndicator.style.animation = '';
          effectIndicator.style.backgroundColor = '';
          effectIndicator.style.color = '';
          effectIndicator.style.borderColor = '';
          
          // Reset title
          titleText.classList.remove('greyed-out');
          titleText.style.opacity = '';
          titleText.style.filter = '';
          
          // Reset all spans in title
          titleText.querySelectorAll('.chroma-char, .static-char').forEach(span => {
            span.classList.remove('greyed-out');
            span.style.animation = '';
            span.style.opacity = '';
            span.style.filter = '';
            span.style.color = '';
          });
          
          // Reset ALL site buttons, not just active ones
          document.querySelectorAll('.site-button').forEach(btn => {
            btn.classList.remove('greyed-out');
            btn.style.opacity = '';
            btn.style.filter = '';
          });
          
          // Reset active site button specifically
          document.querySelectorAll('.site-button.active').forEach(btn => {
            btn.classList.remove('greyed-out');
            btn.style.opacity = '';
            btn.style.filter = '';
            btn.style.animation = settings.effectState === 'wave' || settings.effectState === 'fast' ? '' : 'none';
            
            // Restore proper colors for static mode
            if (settings.effectState !== 'wave' && settings.effectState !== 'fast') {
              btn.style.backgroundColor = hexToRgba(settings.staticColor, 0.2);
              btn.style.borderColor = settings.staticColor;
            }
          });
          
          // Reset ALL speed options and their wrappers
          document.querySelectorAll('.speed-option').forEach(option => {
            option.classList.remove('greyed-out');
            option.style.opacity = '';
            option.style.filter = '';
            option.style.animation = '';
            option.style.backgroundColor = '';
            option.style.color = '';
            option.style.borderColor = '';
          });
          
          document.querySelectorAll('.speed-selector .button-wrapper').forEach(wrapper => {
            wrapper.classList.remove('greyed-out');
            wrapper.style.opacity = '';
            wrapper.style.filter = '';
          });
          
          // Reset all history items
          document.querySelectorAll('#recent-addresses-list .chroma-char').forEach(span => {
            span.classList.remove('greyed-out');
            span.style.animation = '';
            span.style.opacity = '';
            span.style.filter = '';
            span.style.color = '';
          });
          
          // Reset token names
          document.querySelectorAll('.token-name').forEach(tokenName => {
            tokenName.classList.remove('greyed-out');
            tokenName.style.opacity = '';
            tokenName.style.filter = '';
            if (settings.effectState !== 'wave' && settings.effectState !== 'fast') {
              tokenName.style.color = settings.staticColor;
            } else {
              tokenName.style.color = '';
            }
          });
          
          document.querySelectorAll('.token-name.chroma-wave .chroma-char').forEach(span => {
            span.classList.remove('greyed-out');
            span.style.animation = '';
            span.style.opacity = '';
            span.style.filter = '';
            span.style.color = '';
          });
          
          // Reset containers
          document.getElementById('color-picker-container').classList.remove('greyed-out');
          document.getElementById('color-picker-container').style.opacity = '';
          document.getElementById('color-picker-container').style.filter = '';
          
          document.getElementById('speed-selector-container').classList.remove('greyed-out');
          document.getElementById('speed-selector-container').style.opacity = '';
          document.getElementById('speed-selector-container').style.filter = '';
          
          document.querySelectorAll('.site-button-group').forEach(group => {
            group.classList.remove('greyed-out');
            group.style.opacity = '';
            group.style.filter = '';
          });
          
          document.querySelector('.recent-section').classList.remove('greyed-out');
          document.querySelector('.recent-section').style.opacity = '';
          document.querySelector('.recent-section').style.filter = '';
          
          // Force redraw of all speed buttons to ensure they're properly rendered
          document.querySelectorAll('.speed-option').forEach(option => {
            // This forces a browser reflow/repaint
            void option.offsetWidth;
          });
          
          // Re-apply effect styles based on current mode
          updateEffectIndicator(settings);
          
          // If wave effect is enabled, restart animations for sync
          if (settings.effectState === 'wave' || settings.effectState === 'fast') {
            restartAllAnimations();
          }
        } else {
          // OFF state
          statusIndicator.textContent = 'OFF';
          statusIndicator.classList.remove('active');
          statusIndicator.classList.add('inactive');
          statusIndicator.style.backgroundColor = 'rgba(255, 0, 0, 0.2)';
          statusIndicator.style.color = '#ff0000';
          statusIndicator.style.borderColor = '#ff0000';
          
          // Apply greyed-out styling for immediate feedback
          effectIndicator.classList.add('greyed-out');
          // Also set direct styles
          effectIndicator.style.opacity = '0.4';
          effectIndicator.style.filter = 'grayscale(70%)';
          
          // For WAVE button, we need to ensure the animation is disabled
          if (effectIndicator.classList.contains('wave-active')) {
            effectIndicator.style.animation = 'none';
            effectIndicator.style.backgroundColor = 'rgba(128, 128, 128, 0.2)';
            effectIndicator.style.color = '#888';
            effectIndicator.style.borderColor = '#888';
          }
          
          // Apply greyed-out to title
          titleText.classList.add('greyed-out');
          titleText.style.opacity = '0.4';
          titleText.style.filter = 'grayscale(70%)';
          
          // If title has wave spans, disable their animations too
          const spans = titleText.querySelectorAll('.chroma-char, .static-char');
          spans.forEach(span => {
            span.style.animation = 'none';
            span.style.opacity = '0.4';
            span.style.filter = 'grayscale(70%)';
            span.style.color = '#888'; // Grey color
          });
          
          // Disable animations on active site buttons
          document.querySelectorAll('.site-button.active').forEach(btn => {
            btn.classList.add('greyed-out');
            btn.style.opacity = '0.4';
            btn.style.filter = 'grayscale(70%)';
            btn.style.animation = 'none';
            btn.style.backgroundColor = 'rgba(128, 128, 128, 0.2)';
            btn.style.borderColor = '#888';
          });
          
          // Disable animations on ALL speed options
          document.querySelectorAll('.speed-option').forEach(option => {
            option.classList.add('greyed-out');
            option.style.opacity = '0.4';
            option.style.filter = 'grayscale(70%)';
            option.style.animation = 'none';
            option.style.backgroundColor = 'rgba(128, 128, 128, 0.2)';
            option.style.color = '#888';
            option.style.borderColor = '#888';
          });
          
          // Also grey out the speed button wrappers
          document.querySelectorAll('.speed-selector .button-wrapper').forEach(wrapper => {
            wrapper.classList.add('greyed-out');
            wrapper.style.opacity = '0.4';
            wrapper.style.filter = 'grayscale(70%)';
          });
          
          // Disable animations in history section
          document.querySelectorAll('#recent-addresses-list .chroma-char').forEach(span => {
            span.classList.add('greyed-out');
            span.style.animation = 'none';
            span.style.opacity = '0.4';
            span.style.filter = 'grayscale(70%)';
            span.style.color = '#888';
          });
          
          // Disable animations for token names
          document.querySelectorAll('.token-name.chroma-wave .chroma-char').forEach(span => {
            span.classList.add('greyed-out');
            span.style.animation = 'none';
            span.style.opacity = '0.4';
            span.style.filter = 'grayscale(70%)';
            span.style.color = '#888';
          });
          
          document.getElementById('color-picker-container').classList.add('greyed-out');
          document.getElementById('speed-selector-container').classList.add('greyed-out');
          document.querySelectorAll('.site-button-group').forEach(group => {
            group.classList.add('greyed-out');
          });
          document.querySelector('.recent-section').classList.add('greyed-out');
        }
        
        // Save settings and update UI properly
        saveSettings(settings);
      });
    } else {
      console.error('Could not find ON/OFF button wrapper');
    }
    
    // Wave effect toggle (using the wrapper) - now cycles through 3 states: wave -> fast -> static
    const effectWrapper = document.querySelector('.toggle-container:first-child .button-wrapper');
    if (effectWrapper) {
      effectWrapper.addEventListener('click', function() {
        // Get current settings from storage
        safelyExecuteChromeAPI(() => {
          chrome.storage.local.get('settings', function(data) {
            const settings = data.settings || defaultSettings;
            
            // Get current index in the effect states cycle
            let currentIndex = effectStates.indexOf(settings.effectState);
            if (currentIndex === -1) {
              // If not found, default to wave
              currentIndex = 0;
            }
            
            // Move to next state in the cycle
            currentIndex = (currentIndex + 1) % effectStates.length;
            settings.effectState = effectStates[currentIndex];
            
            // Update UI elements for immediate feedback
            updateEffectIndicator(settings);
            
            // Update token names immediately based on new effect setting
            updateHistoryTokenNames(settings);
            
            // If switching to wave or fast state, restart animations for sync
            if (settings.effectState === 'wave' || settings.effectState === 'fast') {
              restartAllAnimations();
            }
            
            saveSettings(settings);
          });
        });
      });
    } else {
      console.error('Could not find effect button wrapper');
    }
    
    // Static color picker
    staticColorPicker.addEventListener('input', function() {
      const newColor = this.value;
      settings.staticColor = newColor;
      
      // Only update if in static mode
      if (settings.effectState !== 'wave' && settings.effectState !== 'fast') {
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
  }
  
  // Function to update token names in the history section with current settings
  function updateHistoryTokenNames(settings) {
    // For static mode, update the color of all token names
    if (settings.effectState !== 'wave' && settings.effectState !== 'fast') {
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
    const titleElement = document.getElementById('title-text');
    
    // Check if the extension is inactive - don't modify styles in this case
    if (!isExtensionActive) {
      // Preserve the greyed-out styles - don't override them
      return;
    }
    
    // Update the display based on the current effect state
    if (settings.effectState === 'wave' || settings.effectState === 'fast') {
      // Wave effect (either normal or fast)
      const isWave = settings.effectState === 'wave';
      effectIndicator.innerHTML = isWave ? '<span>WAVE</span>' : '<span>FAST</span>';
      effectIndicator.className = 'status-indicator wave-active';
      effectIndicator.style.backgroundColor = '';
      effectIndicator.style.color = ''; // Let the CSS animation control the color
      effectIndicator.style.borderColor = ''; // Let the CSS animation control the border
      
      // Hide color picker as we're in a wave mode
      colorPickerContainer.style.display = 'none';
      
      // Update the active site button to use wave animation
      document.querySelectorAll('.site-button.active').forEach(btn => {
        btn.style.animation = '';
        btn.style.backgroundColor = '';
        btn.style.borderColor = '';
      });
      
      // Apply wave animation to title
      if (titleElement) {
        // Clear any existing content
        titleElement.innerHTML = '';
        titleElement.className = 'wave-text';
        
        // Create animation for each character
        const titleText = 'Can Opener';
        [...titleText].forEach((char, index) => {
          const span = document.createElement('span');
          span.textContent = char;
          span.className = char === ' ' ? 'chroma-char space-char' : 'chroma-char';
          span.style.setProperty('--char-index', index);
          titleElement.appendChild(span);
        });
      }
      
      // Apply animation speed based on the mode
      const speedValue = isWave ? 'wave' : 'fast';
      applyAnimationSpeed(speedValue);
    } else {
      // Static effect
      effectIndicator.innerHTML = '<span>STATIC</span>';
      effectIndicator.className = 'status-indicator static-active clickable';
      
      // Apply the selected static color
      effectIndicator.style.backgroundColor = hexToRgba(settings.staticColor, 0.2);
      effectIndicator.style.color = settings.staticColor;
      effectIndicator.style.borderColor = settings.staticColor;
      
      // Show color picker for static mode
      colorPickerContainer.style.display = 'flex';
      
      // Update the active site button to use static color
      document.querySelectorAll('.site-button.active').forEach(btn => {
        btn.style.animation = 'none';
        btn.style.backgroundColor = hexToRgba(settings.staticColor, 0.2);
        btn.style.borderColor = settings.staticColor;
      });
      
      // Apply static color to title
      if (titleElement) {
        // Clear any existing content
        titleElement.innerHTML = '';
        titleElement.className = ''; // Remove wave-text class
        
        // Create static colored spans
        const titleText = 'Can Opener';
        [...titleText].forEach(char => {
          const span = document.createElement('span');
          span.textContent = char;
          span.className = char === ' ' ? 'static-char space-char' : 'static-char';
          span.style.color = settings.staticColor;
          titleElement.appendChild(span);
        });
      }
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
      
      // Clear all button styles to ensure clean state
      siteButtons.forEach(btn => {
        btn.style.animation = '';
        btn.style.backgroundColor = '';
        btn.style.borderColor = '';
        btn.classList.remove('active');
      });
      
      // Apply current settings to UI with a slight delay to ensure clean state
      setTimeout(function() {
        // This will handle all UI updates including site button selection
        updateUI(settings);
        
        // If wave effect is enabled, restart animations
        if (settings.effectState === 'wave' || settings.effectState === 'fast') {
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
    // Update the flags
    isExtensionActive = settings.extensionActive;
    isWaveEffect = settings.effectState === 'wave' || settings.effectState === 'fast';
    
    // Update color picker value
    staticColorPicker.value = settings.staticColor;
    
    // Update effect indicator
    updateEffectIndicator(settings);
    
    // Update trading site
    tradingSiteSelect.value = settings.tradingSite;
    
    // Update active site button
    siteButtons.forEach(btn => {
      // Clear all inline styles from buttons
      btn.style.animation = '';
      btn.style.backgroundColor = '';
      btn.style.borderColor = '';
      
      // Remove active class
      btn.classList.remove('active');
      
      if (btn.getAttribute('data-value') === settings.tradingSite) {
        // Add active class to the selected button
        btn.classList.add('active');
        
        // Apply appropriate styles based on wave/static mode
        if (settings.effectState !== 'wave' && settings.effectState !== 'fast') {
          // Static mode - use the selected color
          btn.style.animation = 'none';
          btn.style.backgroundColor = hexToRgba(settings.staticColor, 0.2);
          btn.style.borderColor = settings.staticColor;
        }
        // No need for else branch as we already cleared styles above
        
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
    });
    
    // Update status indicator and banner
    if (settings.extensionActive) {
      // Update status indicator
      statusIndicator.textContent = 'ON';
      statusIndicator.classList.remove('inactive');
      statusIndicator.classList.add('active');
      
      // Ensure the border color and other styles are set properly
      statusIndicator.style.backgroundColor = 'rgba(0, 204, 0, 0.2)';
      statusIndicator.style.color = '#00cc00';
      statusIndicator.style.borderColor = '#00cc00';
      
      // Banner state depends on whether refresh is needed
      if (refreshNeeded) {
        showRefreshNotification();
    } else {
        resetStatusBanner();
      }
      
      // ENHANCED RESET FOR ON STATE: Remove greyed-out style from all UI elements
      
      // Reset effect indicator
      effectIndicator.classList.remove('greyed-out');
      effectIndicator.style.opacity = '';
      effectIndicator.style.filter = '';
      effectIndicator.style.animation = ''; 
      effectIndicator.style.backgroundColor = '';
      effectIndicator.style.color = '';
      effectIndicator.style.borderColor = '';
          
      // Reset title
      titleText.classList.remove('greyed-out');
      titleText.style.opacity = '';
      titleText.style.filter = '';
      
      // For wave effect, re-enable the animation on all spans in title
      const titleSpans = titleText.querySelectorAll('.chroma-char, .static-char');
      titleSpans.forEach(span => {
        span.classList.remove('greyed-out');
        span.style.animation = '';
        span.style.opacity = '';
        span.style.filter = '';
        span.style.color = '';
      });
      
      // Reset ALL site buttons, not just active ones
      document.querySelectorAll('.site-button').forEach(btn => {
        btn.classList.remove('greyed-out');
        btn.style.opacity = '';
        btn.style.filter = '';
        
        // Only restore animation for non-active buttons
        if (!btn.classList.contains('active')) {
          btn.style.animation = '';
          btn.style.backgroundColor = '';
          btn.style.borderColor = '';
        }
      });
      
      // Reset active site button specifically 
      document.querySelectorAll('.site-button.active').forEach(btn => {
        btn.classList.remove('greyed-out');
        btn.style.opacity = '';
        btn.style.filter = '';
        btn.style.animation = settings.effectState === 'wave' || settings.effectState === 'fast' ? '' : 'none';
        
        // Restore proper colors for static mode
        if (settings.effectState !== 'wave' && settings.effectState !== 'fast') {
          btn.style.backgroundColor = hexToRgba(settings.staticColor, 0.2);
          btn.style.borderColor = settings.staticColor;
        }
      });
      
      // Reset ALL speed options, not just the active one
      document.querySelectorAll('.speed-option').forEach(option => {
        option.classList.remove('greyed-out');
        option.style.opacity = '';
        option.style.filter = '';
        option.style.animation = '';
        option.style.backgroundColor = '';
        option.style.color = '';
        option.style.borderColor = '';
      });
      
      // Reset the active speed option specifically
      document.querySelectorAll('.speed-option.active').forEach(option => {
        option.classList.remove('greyed-out');
        option.style.opacity = '';
        option.style.filter = '';
        option.style.animation = '';
        option.style.backgroundColor = '';
        option.style.color = '';
        option.style.borderColor = '';
      });
      
      // Also reset the speed button wrappers
      document.querySelectorAll('.speed-selector .button-wrapper').forEach(wrapper => {
        wrapper.classList.remove('greyed-out');
        wrapper.style.opacity = '';
        wrapper.style.filter = '';
      });
      
      // Reset all history items
      document.querySelectorAll('#recent-addresses-list .chroma-char').forEach(span => {
        span.classList.remove('greyed-out');
        span.style.animation = '';
        span.style.opacity = '';
        span.style.filter = '';
        span.style.color = '';
      });
      
      // Reset token names
      document.querySelectorAll('.token-name').forEach(tokenName => {
        tokenName.classList.remove('greyed-out');
        tokenName.style.opacity = '';
        tokenName.style.filter = '';
        if (settings.effectState !== 'wave' && settings.effectState !== 'fast') {
          tokenName.style.color = settings.staticColor;
        } else {
          tokenName.style.color = '';
        }
      });
      
      document.querySelectorAll('.token-name.chroma-wave .chroma-char').forEach(span => {
        span.classList.remove('greyed-out');
        span.style.animation = '';
        span.style.opacity = '';
        span.style.filter = '';
        span.style.color = '';
      });
      
      // Reset containers
      document.getElementById('color-picker-container').classList.remove('greyed-out');
      document.getElementById('color-picker-container').style.opacity = '';
      document.getElementById('color-picker-container').style.filter = '';
      
      document.getElementById('speed-selector-container').classList.remove('greyed-out');
      document.getElementById('speed-selector-container').style.opacity = '';
      document.getElementById('speed-selector-container').style.filter = '';
      
      document.querySelectorAll('.site-button-group').forEach(group => {
        group.classList.remove('greyed-out');
        group.style.opacity = '';
        group.style.filter = '';
      });
      
      document.querySelector('.recent-section').classList.remove('greyed-out');
      document.querySelector('.recent-section').style.opacity = '';
      document.querySelector('.recent-section').style.filter = '';
      
      // Re-apply effect styles to ensure proper appearance
      if (settings.effectState === 'wave' || settings.effectState === 'fast') {
        restartAllAnimations();
      }
    } else {
      // OFF state
      statusIndicator.textContent = 'OFF';
      statusIndicator.classList.remove('active');
      statusIndicator.classList.add('inactive');
      
      // Ensure the border color and other styles are set properly
      statusIndicator.style.backgroundColor = 'rgba(255, 0, 0, 0.2)';
      statusIndicator.style.color = '#ff0000';
      statusIndicator.style.borderColor = '#ff0000';
      
      // Banner state depends on whether refresh is needed
      if (refreshNeeded) {
        showRefreshNotification();
      } else {
        setInactiveBanner();
      }
      
      // Apply greyed-out style to the UI elements except OFF button and inactive banner
      effectIndicator.classList.add('greyed-out');
      // Also set direct styles
      effectIndicator.style.opacity = '0.4';
      effectIndicator.style.filter = 'grayscale(70%)';
      
      // For WAVE button, we need to ensure the animation is disabled
      if (effectIndicator.classList.contains('wave-active')) {
        effectIndicator.style.animation = 'none';
        effectIndicator.style.backgroundColor = 'rgba(128, 128, 128, 0.2)';
        effectIndicator.style.color = '#888';
        effectIndicator.style.borderColor = '#888';
      }
      
      // Apply greyed-out to title
      titleText.classList.add('greyed-out');
      titleText.style.opacity = '0.4';
      titleText.style.filter = 'grayscale(70%)';
      
      // If title has wave spans, disable their animations too
      const spans = titleText.querySelectorAll('.chroma-char, .static-char');
      spans.forEach(span => {
        span.style.animation = 'none';
        span.style.opacity = '0.4';
        span.style.filter = 'grayscale(70%)';
        span.style.color = '#888'; // Grey color
      });
      
      // Disable animations on active site buttons
      document.querySelectorAll('.site-button.active').forEach(btn => {
        btn.classList.add('greyed-out');
        btn.style.opacity = '0.4';
        btn.style.filter = 'grayscale(70%)';
        btn.style.animation = 'none';
        btn.style.backgroundColor = 'rgba(128, 128, 128, 0.2)';
        btn.style.borderColor = '#888';
      });
      
      // Disable animations on ALL speed options
      document.querySelectorAll('.speed-option').forEach(option => {
        option.classList.add('greyed-out');
        option.style.opacity = '0.4';
        option.style.filter = 'grayscale(70%)';
        option.style.animation = 'none';
        option.style.backgroundColor = 'rgba(128, 128, 128, 0.2)';
        option.style.color = '#888';
        option.style.borderColor = '#888';
      });
      
      // Also grey out the speed button wrappers
      document.querySelectorAll('.speed-selector .button-wrapper').forEach(wrapper => {
        wrapper.classList.add('greyed-out');
        wrapper.style.opacity = '0.4';
        wrapper.style.filter = 'grayscale(70%)';
      });
      
      // Disable animations in history section
      document.querySelectorAll('#recent-addresses-list .chroma-char').forEach(span => {
        span.classList.add('greyed-out');
        span.style.animation = 'none';
        span.style.opacity = '0.4';
        span.style.filter = 'grayscale(70%)';
        span.style.color = '#888';
      });
      
      // Disable animations for token names
      document.querySelectorAll('.token-name.chroma-wave .chroma-char').forEach(span => {
        span.classList.add('greyed-out');
        span.style.animation = 'none';
        span.style.opacity = '0.4';
        span.style.filter = 'grayscale(70%)';
        span.style.color = '#888';
      });
      
      document.getElementById('color-picker-container').classList.add('greyed-out');
      document.getElementById('speed-selector-container').classList.add('greyed-out');
      document.querySelectorAll('.site-button-group').forEach(group => {
        group.classList.add('greyed-out');
      });
      document.querySelector('.recent-section').classList.add('greyed-out');
    }
    
    // Update speed selector UI
    document.querySelectorAll('.speed-option').forEach(option => {
      if (option.getAttribute('data-speed') === settings.effectState) {
        option.classList.add('active');
      } else {
        option.classList.remove('active');
      }
    });
    
    // Refresh history section to immediately update token names with new color settings
    loadRecentAddresses();
  }
  
  // Function to save settings
  function saveSettings(settings) {
    safelyExecuteChromeAPI(() => {
    chrome.storage.local.set({ settings: settings }, function() {
        try {
          // Check if this is just a color change in static mode
          const isJustColorChange = settings.effectState === 'static' && 
                                   document.activeElement === staticColorPicker;
          
          if (!isJustColorChange) {
            // For other changes, update the full UI
            updateUI(settings);
          }
          
          // Always show refresh notification regardless of extension state
          showRefreshNotification();
          
          // If wave effect is enabled, restart animations to ensure sync
          if (settings.effectState === 'wave' || settings.effectState === 'fast') {
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
              if (option.getAttribute('data-speed') === settings.effectState) {
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
  
  // Find function for applying address styles and update it
  function applyAddressStyle(element) {
    if (!element || !element.textContent) return;
    
    const originalText = element.textContent.trim();
    element.dataset.originalText = originalText;
    element.innerHTML = '';
    
    // Add wave-text class to container for staggered animation
    element.classList.add('wave-text');
    
    // Split the text into characters and apply individual delays for wave effect
    [...originalText].forEach((char, index) => {
      const span = document.createElement('span');
      span.textContent = char;
      span.className = 'chroma-char';
      
      // Set character index as a CSS variable for staggered animation
      span.style.setProperty('--char-index', index);
      
      element.appendChild(span);
    });
    
    // Add the chroma-wave class which can be used as a hook for GPU acceleration
    element.classList.add('chroma-wave');
  }
  
  // Load recent addresses
  function loadRecentAddresses() {
  // Fetch recent addresses from storage
  chrome.storage.local.get(['recentAddresses', 'settings'], function(result) {
    const recentAddresses = result.recentAddresses || [];
    const settings = result.settings || defaultSettings;
    
    // Clear loading message
    recentAddressesList.innerHTML = '';
    
    if (recentAddresses.length === 0) {
      // Show empty state
      recentAddressesList.innerHTML = `
        <div class="empty-state">
                History is empty. Tokens will appear here after clicking addresses online.
        </div>
      `;
      return;
    }
    
    // Create address items
    recentAddresses.forEach(item => {
      const addressItem = document.createElement('div');
      addressItem.className = 'address-item';
      
      const addressLink = document.createElement('a');
      addressLink.className = 'address-link';
      addressLink.href = buildTradingSiteUrl(item.address, settings.tradingSite);
      addressLink.target = '_blank';
      addressLink.rel = 'noopener noreferrer';
      
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
          
          if (settings.effectState === 'wave' || settings.effectState === 'fast') {
            // Apply wave effect to token name
            tokenName.className = 'token-name chroma-wave wave-text';
            
            // Split token name into characters for the wave effect
            const nameChars = item.tokenMetadata.name.split('');
            nameChars.forEach((char, index) => {
              const span = document.createElement('span');
              span.textContent = char;
              // Set character index for staggered animation
              span.style.setProperty('--char-index', index);
              span.className = 'chroma-char';
              tokenName.appendChild(span);
            });
          } else {
            // Static color mode
            tokenName.className = 'token-name';
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
        addressLink.appendChild(tokenContainer);
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
  });
  }
  
  // Start initializing the UI
  initMainUI();
  
  // Update isWaveEffect reference for compatibility with existing code
  function isWaveEffectMode(settings) {
    return settings.effectState === 'wave' || settings.effectState === 'fast';
  }
  
  // Function for compatibility with existing code that expected waveEffect boolean
  function getWaveEffectStatus(settings) {
    return settings.effectState === 'wave' || settings.effectState === 'fast';
  }
}); 