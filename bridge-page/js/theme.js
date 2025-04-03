document.addEventListener('DOMContentLoaded', () => {
    const supportDevBtn = document.getElementById('supportDevBtn');
    const supportSection = document.getElementById('supportDev');
    const feedbackToggle = document.getElementById('feedbackToggle');
    const feedbackContent = document.getElementById('feedbackContent');
    const toggleIcon = feedbackToggle.querySelector('.toggle-icon');
    
    // Flag to track if we've done a manual scroll
    let hasPerformedManualScroll = false;
    
    // Support Development button scroll
    supportDevBtn.addEventListener('click', () => {
        scrollToSupportSection();
    });

    // Toggle feedback section
    feedbackToggle.addEventListener('click', () => {
        feedbackContent.classList.toggle('active');
        toggleIcon.classList.toggle('active');
    });
    
    // Function to scroll to and highlight the support section
    function scrollToSupportSection() {
        console.log('Executing scrollToSupportSection');
        
        // Ensure we're at the top first for a better UX
        if (!hasPerformedManualScroll) {
            console.log('Scrolling to top before moving to support section');
            window.scrollTo(0, 0);
        }
        
        // Use setTimeout to ensure a visual pause at the top of the page
        setTimeout(() => {
            console.log('Now scrolling to support section');
            
            // Perform smooth scroll to the support section
            supportSection.scrollIntoView({ behavior: 'smooth' });
            
            // Reset animation by removing class and forcing reflow
            supportSection.classList.remove('highlight-section');
            void supportSection.offsetWidth;
            
            // Add highlight animation with wave effect
            supportSection.classList.add('highlight-section');
            
            // Mark that we've done a manual scroll
            hasPerformedManualScroll = true;
            
            console.log('Scroll and highlight complete');
        }, 800); // Shorter delay for better responsiveness once the page is loaded
    }
    
    // Main function to check URL parameters and handle scrolling
    function handleURLParameters() {
        console.log('Checking URL parameters for scroll triggers');
        
        // Get URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        
        // Check if we have a highlight=support parameter
        if (urlParams.get('highlight') === 'support') {
            console.log('Found highlight=support parameter');
            
            // Force scroll to top first to ensure we see the page from the beginning
            window.scrollTo(0, 0);
            
            // Extra safety - make sure we're really at the top
            setTimeout(() => {
                window.scrollTo(0, 0);
                
                // Use a delay to ensure the page is fully loaded
                setTimeout(() => {
                    console.log('Page should be fully loaded, executing scroll');
                    scrollToSupportSection();
                }, 1200);
            }, 100);
            
            return true;
        }
        
        return false;
    }
    
    // Initialization function
    function init() {
        console.log('Theme.js initialization');
        
        // Check URL parameters on page load
        handleURLParameters();
    }
    
    // Run initialization
    init();
}); 