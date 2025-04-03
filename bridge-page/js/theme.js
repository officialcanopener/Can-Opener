document.addEventListener('DOMContentLoaded', () => {
    const supportDevBtn = document.getElementById('supportDevBtn');
    const supportSection = document.getElementById('supportDev');
    const feedbackToggle = document.getElementById('feedbackToggle');
    const feedbackContent = document.getElementById('feedbackContent');
    const toggleIcon = feedbackToggle.querySelector('.toggle-icon');
    
    // Support Development button scroll
    supportDevBtn.addEventListener('click', () => {
        supportSection.scrollIntoView({ behavior: 'smooth' });
        
        // Reset animation by removing class and forcing reflow
        supportSection.classList.remove('highlight-section');
        void supportSection.offsetWidth;
        
        // Add highlight animation with wave effect
        supportSection.classList.add('highlight-section');
    });

    // Toggle feedback section
    feedbackToggle.addEventListener('click', () => {
        feedbackContent.classList.toggle('active');
        toggleIcon.classList.toggle('active');
    });
}); 