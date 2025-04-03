/*
TEMPORARY COMMENT - TIP SECTION FUNCTIONALITY REMOVED (TO BE RESTORED LATER)
This entire file's functionality related to wallet connection, tipping, and amount selection
has been temporarily commented out as it's not working correctly.
The only functionality kept active is the copy address button at the bottom.
The plan is to restore this functionality in a future update.

// Constants
const WALLET_ADDRESS = '84U4Z1E7iYdXjkhBUWgDTAuDEf6LLCGSfg35VmxAE5Eo';
const LAMPORTS_PER_SOL = 1000000000;

// DOM Elements
const connectWalletBtn = document.getElementById('connectWallet');
const sendTipBtn = document.getElementById('sendTip');
const statusMessage = document.getElementById('status');
const tipAmountBtns = document.querySelectorAll('.tip-amount');
const customAmountInput = document.getElementById('customAmount');
const customAmountWrapper = document.querySelector('.custom-amount-wrapper');

let selectedAmount = null;
let phantomProvider = null;
let publicKey = null;

// Initialize
function initialize() {
    if ('phantom' in window) {
        phantomProvider = window.phantom?.solana;
        
        if (phantomProvider?.isPhantom) {
            // Auto-connect if previously connected
            phantomProvider.connect({ onlyIfTrusted: true })
                .then(({ publicKey }) => {
                    handleConnected(publicKey);
                })
                .catch(() => {
                    // Not auto-connected, wait for user to click connect
                });
        } else {
            updateStatus('Phantom wallet not found. Please install Phantom to continue.', 'error');
            connectWalletBtn.disabled = true;
        }
    }
    
    // No tip amount selected by default
    customAmountInput.placeholder = "Custom amount";
}

// Update status message
function updateStatus(message, type = 'info') {
    statusMessage.textContent = message;
    statusMessage.className = `status-message ${type}-message`;
    
    // Add connected-status class for connected state
    if (message.startsWith('Connected:')) {
        statusMessage.classList.add('connected-status');
    }
}

// Handle successful connection
function handleConnected(key) {
    publicKey = key;
    connectWalletBtn.style.display = 'none';
    sendTipBtn.style.display = 'block';
    updateStatus(`Connected: ${key.toString().slice(0, 4)}...${key.toString().slice(-4)}`);
}

// Connect wallet
async function connectWallet() {
    try {
        const resp = await phantomProvider.connect();
        handleConnected(resp.publicKey);
    } catch (err) {
        updateStatus('Failed to connect wallet: ' + err.message, 'error');
    }
}

// Send transaction
async function sendTip() {
    try {
        if (!publicKey) {
            throw new Error('Please connect your wallet first');
        }
        
        if (!selectedAmount || selectedAmount <= 0) {
            throw new Error('Please select or enter a valid tip amount');
        }

        updateStatus('Creating transaction...');
        sendTipBtn.disabled = true;

        const lamports = selectedAmount * LAMPORTS_PER_SOL;
        
        // Use the injected solanaWeb3 object
        if (!window.solanaWeb3) {
            throw new Error('Solana Web3 not loaded. Please refresh the page.');
        }
        
        const connection = new solanaWeb3.Connection(
            solanaWeb3.clusterApiUrl('mainnet-beta'),
            'confirmed'
        );

        const transaction = new solanaWeb3.Transaction().add(
            solanaWeb3.SystemProgram.transfer({
                fromPubkey: publicKey,
                toPubkey: new solanaWeb3.PublicKey(WALLET_ADDRESS),
                lamports: lamports
            })
        );

        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = publicKey;

        updateStatus('Please confirm the transaction in your wallet...');
        
        const signature = await phantomProvider.signAndSendTransaction(transaction);
        
        updateStatus('Transaction sent! Waiting for confirmation...');
        
        const confirmation = await connection.confirmTransaction(signature.signature);
        
        if (confirmation.value && confirmation.value.err) {
            throw new Error('Transaction failed');
        }

        updateStatus('Thank you for your support! Transaction successful.', 'success');
        
        // Add transaction link
        const explorerLink = document.createElement('a');
        explorerLink.href = `https://explorer.solana.com/tx/${signature.signature}`;
        explorerLink.textContent = 'View on Solana Explorer';
        explorerLink.target = '_blank';
        explorerLink.style.display = 'block';
        explorerLink.style.marginTop = '10px';
        statusMessage.appendChild(explorerLink);

    } catch (err) {
        updateStatus('Transaction failed: ' + err.message, 'error');
        sendTipBtn.disabled = false;
    }
}

// Handle amount selection
function handleAmountSelection(amount) {
    selectedAmount = amount;
    
    // Clear previous selections
    tipAmountBtns.forEach(btn => {
        // Remove selected class
        btn.classList.remove('selected');
        
        // Get the text element and remove wave effect
        const tipText = btn.querySelector('.tip-text');
        if (tipText) tipText.classList.remove('wave-active');
        
        // If this is the selected amount, add classes
        if (parseFloat(btn.dataset.amount) === amount) {
            btn.classList.add('selected');
            if (tipText) tipText.classList.add('wave-active');
        }
    });
    
    // Update custom amount field and remove its active state
    customAmountInput.value = amount;
    customAmountWrapper.classList.remove('active');
}

// Event Listeners
connectWalletBtn.addEventListener('click', connectWallet);
sendTipBtn.addEventListener('click', sendTip);

tipAmountBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        handleAmountSelection(parseFloat(btn.dataset.amount));
    });
});

// Custom amount input handling
customAmountInput.addEventListener('focus', () => {
    // Clear tip button selections when custom amount gets focus
    tipAmountBtns.forEach(btn => {
        btn.classList.remove('selected');
        const tipText = btn.querySelector('.tip-text');
        if (tipText) tipText.classList.remove('wave-active');
    });
    
    // Add active class to show wave border
    customAmountWrapper.classList.add('active');
});

customAmountInput.addEventListener('input', (e) => {
    const amount = parseFloat(e.target.value);
    if (!isNaN(amount) && amount > 0) {
        selectedAmount = amount;
        
        // Clear any tip button selections
        tipAmountBtns.forEach(btn => {
            btn.classList.remove('selected');
            const tipText = btn.querySelector('.tip-text');
            if (tipText) tipText.classList.remove('wave-active');
        });
        
        // Add active class to show wave border
        customAmountWrapper.classList.add('active');
        
        // Format the value to always have 2 decimal places
        if (!e.target.value.includes('.')) {
            e.target.value = parseFloat(e.target.value).toFixed(2);
        }
    } else if (e.target.value === '') {
        selectedAmount = null;
        // Keep active class to show it's being interacted with
        customAmountWrapper.classList.add('active');
    }
});

// Handle blur event - keep active class if the field has a value
customAmountInput.addEventListener('blur', () => {
    if (!customAmountInput.value) {
        // Only remove active class if empty
        customAmountWrapper.classList.remove('active');
    } else {
        // Keep active class if there's a value
        customAmountWrapper.classList.add('active');
        
        // Ensure the value has 2 decimal places when losing focus
        const val = parseFloat(customAmountInput.value);
        if (!isNaN(val)) {
            customAmountInput.value = val.toFixed(2);
        }
    }
});

// Handle custom increment/decrement controls
const incrementBtn = document.getElementById('increment');
const decrementBtn = document.getElementById('decrement');

if (incrementBtn && decrementBtn) {
    let incrementTimer;
    let decrementTimer;
    let incrementSpeed = 200; // Initial delay between increments in ms
    let decrementSpeed = 200; // Initial delay between decrements in ms
    let speedUpFactor = 0.8; // Speed increases by this factor while holding
    let minSpeed = 50; // Fastest speed in ms

    function performIncrement() {
        let newValue;
        
        // If the input is empty or 0, start at 0.01
        if (!customAmountInput.value || parseFloat(customAmountInput.value) === 0) {
            newValue = 0.01;
        } else {
            const currentValue = parseFloat(customAmountInput.value);
            newValue = currentValue + 0.01;
        }
        
        // Format to always show 2 decimal places
        customAmountInput.value = newValue.toFixed(2);
        selectedAmount = newValue;
        
        // Trigger input event to update selected amount
        const inputEvent = new Event('input', { bubbles: true });
        customAmountInput.dispatchEvent(inputEvent);
        
        // Add active class to show wave border
        customAmountWrapper.classList.add('active');
        
        // Clear any selected tip buttons
        tipAmountBtns.forEach(btn => {
            btn.classList.remove('selected');
            const tipText = btn.querySelector('.tip-text');
            if (tipText) tipText.classList.remove('wave-active');
        });
        
        // Speed up for next increment if held down
        incrementSpeed = Math.max(minSpeed, incrementSpeed * speedUpFactor);
        
        // Continue incrementing while button is held
        incrementTimer = setTimeout(performIncrement, incrementSpeed);
    }
    
    function performDecrement() {
        // Do nothing if the input is empty
        if (!customAmountInput.value) {
            return;
        }
        
        const currentValue = parseFloat(customAmountInput.value);
        // Ensure we don't go below 0.01
        const newValue = Math.max(0.01, currentValue - 0.01);
        
        // Format to always show 2 decimal places
        customAmountInput.value = newValue.toFixed(2);
        selectedAmount = newValue;
        
        // Trigger input event to update selected amount
        const inputEvent = new Event('input', { bubbles: true });
        customAmountInput.dispatchEvent(inputEvent);
        
        // Add active class to show wave border
        customAmountWrapper.classList.add('active');
        
        // Clear any selected tip buttons
        tipAmountBtns.forEach(btn => {
            btn.classList.remove('selected');
            const tipText = btn.querySelector('.tip-text');
            if (tipText) tipText.classList.remove('wave-active');
        });
        
        // Speed up for next decrement if held down
        decrementSpeed = Math.max(minSpeed, decrementSpeed * speedUpFactor);
        
        // Continue decrementing while button is held
        decrementTimer = setTimeout(performDecrement, decrementSpeed);
    }
    
    function stopIncrement() {
        clearTimeout(incrementTimer);
        incrementSpeed = 200; // Reset speed for next press
    }
    
    function stopDecrement() {
        clearTimeout(decrementTimer);
        decrementSpeed = 200; // Reset speed for next press
    }
    
    // Single click handlers
    incrementBtn.addEventListener('click', () => {
        // This will still fire for single clicks
    });
    
    decrementBtn.addEventListener('click', () => {
        // This will still fire for single clicks
    });
    
    // Hold down handlers for increment button
    incrementBtn.addEventListener('mousedown', () => {
        performIncrement(); // Start immediately
    });
    
    incrementBtn.addEventListener('mouseup', stopIncrement);
    incrementBtn.addEventListener('mouseleave', stopIncrement);
    
    // Hold down handlers for decrement button
    decrementBtn.addEventListener('mousedown', () => {
        performDecrement(); // Start immediately
    });
    
    decrementBtn.addEventListener('mouseup', stopDecrement);
    decrementBtn.addEventListener('mouseleave', stopDecrement);
    
    // Touch support for mobile devices
    incrementBtn.addEventListener('touchstart', (e) => {
        performIncrement();
    }, { passive: true });
    
    incrementBtn.addEventListener('touchend', (e) => {
        stopIncrement();
    }, { passive: true });
    
    decrementBtn.addEventListener('touchstart', (e) => {
        performDecrement();
    }, { passive: true });
    
    decrementBtn.addEventListener('touchend', (e) => {
        stopDecrement();
    }, { passive: true });
}

// Initialize on load
document.addEventListener('DOMContentLoaded', initialize);
*/

// Copy address functionality - KEEPING THIS PART ACTIVE
const copyAddressButton = document.getElementById('copyAddressButton');
const walletAddressInput = document.getElementById('walletAddressInput');

if (copyAddressButton && walletAddressInput) {
    copyAddressButton.addEventListener('click', () => {
        // Use the Clipboard API instead of select() to avoid visible highlighting
        if (navigator.clipboard && navigator.clipboard.writeText) {
            // Modern approach - use Clipboard API
            navigator.clipboard.writeText(walletAddressInput.value)
                .then(() => {
                    showCopyFeedback();
                })
                .catch(() => {
                    // Fallback to the old method if Clipboard API fails
                    fallbackCopy();
                });
        } else {
            // Fallback for browsers without Clipboard API
            fallbackCopy();
        }
    });
    
    function fallbackCopy() {
        // Select the text
        walletAddressInput.select();
        document.execCommand('copy');
        // Immediately deselect to remove highlighting
        window.getSelection().removeAllRanges();
        walletAddressInput.blur();
        showCopyFeedback();
    }
    
    function showCopyFeedback() {
        // Show feedback
        const originalText = copyAddressButton.innerHTML;
        copyAddressButton.innerHTML = '<span>Copied!</span>';
        
        // Trigger confetti effect
        const buttonRect = copyAddressButton.getBoundingClientRect();
        const buttonCenterX = buttonRect.left + buttonRect.width / 2;
        const buttonTopY = buttonRect.top;
        
        // Convert to origin coordinates for confetti
        const originX = buttonCenterX / window.innerWidth;
        const originY = buttonTopY / window.innerHeight;
        
        // Launch confetti
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { x: originX, y: originY },
            colors: ['#00ffff', '#00ff00', '#ffff00', '#ff0000', '#ff00ff', '#0000ff'],
            zIndex: 1000,
            disableForReducedMotion: true
        });
        
        // Reset after 3 seconds
        setTimeout(() => {
            copyAddressButton.innerHTML = originalText;
        }, 3000);
    }
} 