document.addEventListener('DOMContentLoaded', () => {
    const supportDevBtn = document.getElementById('supportDevBtn');
    const supportSection = document.getElementById('supportDev');
    const feedbackToggle = document.getElementById('feedbackToggle');
    const feedbackContent = document.getElementById('feedbackContent');
    const toggleIcon = feedbackToggle.querySelector('.toggle-icon');
    
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
        supportSection.scrollIntoView({ behavior: 'smooth' });
        
        // Reset animation by removing class and forcing reflow
        supportSection.classList.remove('highlight-section');
        void supportSection.offsetWidth;
        
        // Add highlight animation with wave effect
        supportSection.classList.add('highlight-section');
    }
    
    // Check URL for highlight parameter and auto-scroll if present
    function checkURLParams() {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('highlight') && urlParams.get('highlight') === 'support') {
            // Check if delay parameter is present
            const shouldDelay = urlParams.has('delay');
            
            // Use a longer delay if the delay parameter is present
            const delayTime = shouldDelay ? 1500 : 500;
            
            // If delay parameter is present, scroll to top first
            if (shouldDelay) {
                window.scrollTo(0, 0);
            }
            
            // Delay the scroll to ensure the page is fully loaded and
            // user sees the top of the page first
            setTimeout(() => {
                scrollToSupportSection();
            }, delayTime);
        }
    }
    
    // Also check for hash in URL
    function checkURLHash() {
        if (window.location.hash === '#supportDev') {
            // Small delay to ensure the page is fully loaded
            setTimeout(() => {
                scrollToSupportSection();
            }, 500);
        }
    }
    
    // Run checks when page loads
    checkURLParams();
    checkURLHash();
}); 