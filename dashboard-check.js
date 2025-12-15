// Add to dashboard-real.html to prevent infinite loops
async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = 'index.html';
    } else {
        console.log('User logged in:', session.user.email);
        // Load dashboard data here
    }
}
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkAuth);
} else {
    checkAuth();
}
