// SPA Navigation Framework for PromoSync
// Add this to a new file: spa-nav.js

// Load page content into main container
async function loadPage(pageName) {
    const contentArea = document.getElementById('page-content');
    
    // Show loading
    contentArea.innerHTML = '<div style="text-align: center; padding: 48px; color: #8b95ab;">Loading...</div>';
    
    // Fetch the page
    try {
        const response = await fetch(`${pageName}-real.html`);
        const html = await response.text();
        
        // Extract just the main content (everything inside the container div)
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const content = doc.querySelector('.container').innerHTML;
        
        // Remove header/nav from loaded content (we already have it)
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = content;
        const header = tempDiv.querySelector('header');
        if (header) header.remove();
        
        // Insert content
        contentArea.innerHTML = tempDiv.innerHTML;
        
        // Update nav active state
        updateNavActive(pageName);
        
        // Run any page-specific init scripts
        if (window[`init${capitalize(pageName)}`]) {
            window[`init${capitalize(pageName)}`]();
        }
        
    } catch (error) {
        console.error('Error loading page:', error);
        contentArea.innerHTML = '<div style="text-align: center; padding: 48px; color: #ff4757;">Error loading page</div>';
    }
}

// Update nav active states
function updateNavActive(pageName) {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-page') === pageName) {
            link.classList.add('active');
        }
    });
}

// Helper function
function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    // Set up nav click handlers
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.getAttribute('data-page');
            if (page === 'dashboard') {
                // Show dashboard content
                document.getElementById('dashboard-content').style.display = 'block';
                const pageContent = document.getElementById('page-content');
                if (pageContent) pageContent.style.display = 'none';
                updateNavActive('dashboard');
            } else {
                // Load other pages
                const dashContent = document.getElementById('dashboard-content');
                const pageContent = document.getElementById('page-content');
                if (dashContent) dashContent.style.display = 'none';
                if (pageContent) pageContent.style.display = 'block';
                loadPage(page);
            }
        });
    });
});
