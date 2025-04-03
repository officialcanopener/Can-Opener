// Add event listener for when the page is FULLY loaded (including all resources)
window.onload = function() {
    console.log('Window fully loaded');
    
    // Get references to DOM elements
    const supportDevBtn = document.getElementById('supportDevBtn');
    const supportSection = document.getElementById('supportDev');
    const feedbackToggle = document.getElementById('feedbackToggle');
    const feedbackContent = document.getElementById('feedbackContent');
    const toggleIcon = feedbackToggle ? feedbackToggle.querySelector('.toggle-icon') : null;
    
    // Support Development button scroll
    if (supportDevBtn) {
        supportDevBtn.addEventListener('click', function() {
            scrollToSupportWithAnimation();
        });
    }

    // Toggle feedback section
    if (feedbackToggle) {
        feedbackToggle.addEventListener('click', function() {
            feedbackContent.classList.toggle('active');
            toggleIcon.classList.toggle('active');
        });
    }
    
    // Immediately check URL on full page load
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('highlight') === 'support' && supportSection) {
        console.log('Support highlight parameter found');
        
        // Force scroll to top first then wait
        window.scrollTo(0, 0);
        
        // Use a single timeout with a longer delay
        setTimeout(function() {
            scrollToSupportWithAnimation();
        }, 2000);
    }
    
    // Simplified function to scroll and animate
    function scrollToSupportWithAnimation() {
        if (!supportSection) return;
        
        console.log('Executing scroll to support section');
        
        // Get the position of the element relative to the document
        const rect = supportSection.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const targetPosition = rect.top + scrollTop - 100; // 100px offset from top
        
        // Scroll to position with plain JS
        window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
        });
        
        // Add the highlight animation after scrolling
        setTimeout(function() {
            // Reset animation by removing class and forcing reflow
            supportSection.classList.remove('highlight-section');
            void supportSection.offsetWidth;
            
            // Add highlight animation
            supportSection.classList.add('highlight-section');
            console.log('Highlight animation applied');
        }, 1000); // Wait for scroll to complete
    }
}; 