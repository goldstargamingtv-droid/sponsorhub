// Supabase Configuration
const SUPABASE_URL = 'https://dvbyxtkghbsjiglxjnvt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2Ynl4dGtnaGJzamlnbHhqbnZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ5MTgzOTQsImV4cCI6MjA1MDQ5NDM5NH0.AW_L63Y5XPmLvxI6zCN5xAOXl1-YNPwjddhMTVDY3-Y';

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
window.supabase = supabase; // Make available to data-service.js

// Auth Helper Functions
async function getCurrentUser() {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        return session?.user || null;
    } catch (error) {
        console.error('Error getting current user:', error);
        return null;
    }
}

async function getUserProfile(userId) {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error fetching user profile:', error);
        return null;
    }
}

async function signOut() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Error signing out:', error);
        alert('Error signing out: ' + error.message);
    }
}

// OAuth Sign In Functions
async function signInWithTwitch() {
    try {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'twitch',
            options: {
                redirectTo: 'https://goldstargamingtv-droid.github.io/sponsorhub/dashboard-real.html'
            }
        });
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Twitch sign-in error:', error);
        throw error;
    }
}

async function signInWithYouTube() {
    try {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: 'https://goldstargamingtv-droid.github.io/sponsorhub/dashboard-real.html',
                scopes: 'https://www.googleapis.com/auth/youtube.readonly'
            }
        });
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('YouTube sign-in error:', error);
        throw error;
    }
}

// Profile Creation/Update
async function createOrUpdateProfile(userId, profileData) {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .upsert({
                id: userId,
                ...profileData,
                updated_at: new Date().toISOString()
            })
            .select()
            .single();
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error creating/updating profile:', error);
        throw error;
    }
}

// Auth State Change Listener
supabase.auth.onAuthStateChange((event, session) => {
    console.log('Auth event:', event);
    console.log('Session:', session);
    
    if (event === 'SIGNED_IN') {
        console.log('User signed in:', session.user);
    } else if (event === 'SIGNED_OUT') {
        console.log('User signed out');
    }
});

console.log('Supabase initialized successfully');
