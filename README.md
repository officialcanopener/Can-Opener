# Can Opener

A powerful Chrome extension that enhances your cryptocurrency browsing experience by identifying Solana token addresses on web pages and providing visually appealing animation effects, quick navigation to trading platforms, and a convenient address history tracker.

## Key Features

### Address Enhancement
- **Automatic Detection**: Identifies Solana token addresses on any web page in real-time
- **Visual Highlighting**: Adds eye-catching animations to token addresses for quick recognition
- **One-Click Trading**: Makes all contract addresses clickable for immediate viewing on your preferred trading platform

### Visual Effects
- **WAVE Animation**: Adds a synchronized rainbow color wave animation to addresses and token names
- **STATIC Color Mode**: Option to use a single static color instead of animations
- **Customizable Colors**: Color picker for selecting your preferred static highlight color
- **Animation Speed Control**: Three speed options (slow, medium, fast) to adjust animation pace

### Trading Platform Integration
- **Multi-Platform Support**: Seamlessly open token addresses on your preferred trading platform:
  - Axiom
  - BullX
  - Photon
  - GMGN
  - DexScreener
  - Birdeye
- **Easy Platform Switching**: Quick toggle between different trading platforms

### History Tracking
- **Address History**: Keeps track of recently viewed token addresses
- **Token Information**: Displays token names, symbols, and logos when available
- **Timestamp Tracking**: Shows when each address was last viewed

### User Interface
- **Intuitive Controls**: Clean, user-friendly popup interface
- **Global Toggle**: Easily enable/disable the extension with a single click
- **Refresh Notification**: Alerts when page refresh is needed after changing settings

## Usage Guide

### Basic Usage
1. **Enable the Extension**: Click the ON button in the popup to activate the extension
2. **Browse Any Website**: The extension will automatically detect and enhance Solana token addresses
3. **Click Addresses**: Click on any enhanced address to open it in your selected trading platform
4. **View History**: Open the extension popup to see your recently viewed token addresses

### Customization Options
1. **Animation Type**: Toggle between WAVE (animated rainbow) and STATIC (solid color) modes
2. **Animation Speed**: Select from three speed options (1=slow, 2=medium, 3=fast)
3. **Static Color**: Use the color picker to select your preferred highlight color when in STATIC mode
4. **Trading Platform**: Choose your preferred platform for viewing token details

### Status Indicators
- **Active Banner**: Green status indicator when the extension is functioning normally
- **Refresh Required**: Orange banner appears when settings have changed and a page refresh is needed
- **Inactive**: Red indicator when the extension is turned off

## Technical Details

The extension uses a sophisticated animation synchronization system to ensure all visual effects remain in perfect harmony across the page. It leverages Chrome's storage API to maintain consistent settings across tabs and sessions.

For address detection, it employs pattern matching to identify potential Solana addresses, validates them, and then enhances the display with visual indicators and clickable functionality.

## Privacy and Permissions

Can Opener only requires permissions to:
- Read and modify website content (to detect and enhance addresses)
- Access browser storage (to save your settings and address history)
- Connect to trading platforms (when you click on an address)

No data is sent to external servers except when explicitly clicking to view a token on a trading platform.

## Feedback and Support

For questions, feature requests, or bug reports, please open an issue in this repository.

## Files in this Repository

- `manifest.json`: Configuration file for the Chrome extension
- `content.js`: Script that runs on web pages to detect and modify Solana addresses
- `styles.css`: Styles for the extension elements
- `popup.html`: The extension popup interface
- `popup.js`: Script that handles popup functionality and user interactions
- `popup.css`: Styles for the popup interface
- `background.js`: Background script that handles cross-tab communication
- `*.png`: Various icon files for the different trading platforms supported by the extension
