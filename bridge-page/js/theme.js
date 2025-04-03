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
    
    // Check if URL has parameters
    function checkURLForScrollTriggers() {
        console.log('Checking URL for scroll triggers');
        
        // Check for highlight parameter in query string
        const urlParams = new URLSearchParams(window.location.search);
        const highlightParam = urlParams.get('highlight');
        
        if (highlightParam === 'support') {
            console.log('Found support highlight parameter');
            
            // Scroll to top first
            window.scrollTo(0, 0);
            
            // Use a longer delay to ensure the page loads completely
            setTimeout(() => {
                console.log('Executing delayed scroll');
                scrollToSupportSection();
            }, 1500);
            
            return true;
        }
        
        // Check for hash in URL (alternative method)
        if (window.location.hash === '#supportDev') {
            console.log('Found supportDev hash');
            
            // Scroll to top first
            window.scrollTo(0, 0);
            
            // Use a longer delay to ensure the page loads completely
            setTimeout(() => {
                console.log('Executing delayed scroll from hash');
                scrollToSupportSection();
            }, 1500);
            
            return true;
        }
        
        return false;
    }
    
    // Run the check when the page loads
    checkURLForScrollTriggers();
    
    // Also check again after a short delay to ensure the page is fully loaded
    setTimeout(checkURLForScrollTriggers, 500);
}); 