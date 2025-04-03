document.addEventListener('DOMContentLoaded', () => {
    // Get references to DOM elements
    const supportDevBtn = document.getElementById('supportDevBtn');
    const supportSection = document.getElementById('supportDev');
    const feedbackToggle = document.getElementById('feedbackToggle');
    const feedbackContent = document.getElementById('feedbackContent');
    const toggleIcon = feedbackToggle.querySelector('.toggle-icon');
    
    // Global flag to track if scrolling is needed
    let needsScrollToSupport = false;
    
    // Support Development button scroll
    supportDevBtn.addEventListener('click', () => {
        // Just perform scroll directly without extra logic
        performScrollToSupport();
    });

    // Toggle feedback section
    feedbackToggle.addEventListener('click', () => {
        feedbackContent.classList.toggle('active');
        toggleIcon.classList.toggle('active');
    });
    
    // Check URL parameters immediately
    checkURLParameters();
    
    // Set up a safe scroll handler with long enough delays
    function checkURLParameters() {
        console.log('Checking URL parameters');
        
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('highlight') === 'support') {
            console.log('Found highlight=support parameter, setting up scroll');
            
            // Force scroll to top immediately
            window.scrollTo(0, 0);
            
            // Set the global flag
            needsScrollToSupport = true;
            
            // Set up a series of attempts to ensure scrolling happens
            setTimeout(attemptScroll, 1000);
            setTimeout(attemptScroll, 2000);
            setTimeout(attemptScroll, 3000);
        }
    }
    
    // Function to attempt scrolling if needed
    function attemptScroll() {
        if (needsScrollToSupport) {
            console.log('Attempting scroll to support section');
            performScrollToSupport();
        }
    }
    
    // Actual scroll implementation
    function performScrollToSupport() {
        console.log('Performing scroll to support section');
        
        // Reset the flag as we're handling the scroll now
        needsScrollToSupport = false;
        
        // Ensure we're at the top first
        window.scrollTo(0, 0);
        
        // Set up the delayed scroll
        setTimeout(() => {
            console.log('Now executing scroll');
            
            // Scroll to the support section
            supportSection.scrollIntoView({ behavior: 'smooth' });
            
            // Reset and apply the highlight animation
            supportSection.classList.remove('highlight-section');
            void supportSection.offsetWidth;
            supportSection.classList.add('highlight-section');
            
            console.log('Scroll complete');
        }, 1500);
    }
}); 