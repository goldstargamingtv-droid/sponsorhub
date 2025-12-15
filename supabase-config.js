// Supabase Configuration
const SUPABASE_URL = 'https://dvbyxtkghbsjiglxjnvt.supabase.co'; // Replace with your actual Supabase URL
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2Ynl4dGtnaGJzamlnbHhqbnZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2MTMzNjUsImV4cCI6MjA4MTE4OTM2NX0.7Ari03dGk3fQLUIauZZnl21pDrxz7-ImPYR_idaAoyM'; // Replace with your actual anon key

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Auth State Manager
class AuthManager {
    constructor() {
        this.user = null;
        this.profile = null;
        this.isDemoMode = false;
    }

    async init() {
        // Check for demo mode
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('demo') === 'true' || localStorage.getItem('demoMode') === 'true') {
            this.enableDemoMode();
            return;
        }

        // Check auth state
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            this.user = session.user;
            await this.loadProfile();
        }

        // Listen for auth changes
        supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN') {
                this.user = session.user;
                this.loadProfile().then(() => {
                    window.location.href = 'dashboard-real.html';
                });
            } else if (event === 'SIGNED_OUT') {
                this.user = null;
                this.profile = null;
                window.location.href = 'index.html';
            }
        });
    }

    enableDemoMode() {
        this.isDemoMode = true;
        localStorage.setItem('demoMode', 'true');
        this.profile = {
            id: 'demo-user',
            username: 'DemoCreator',
            full_name: 'Demo Creator',
            email: 'demo@promosync.com',
            twitch_username: 'democreator',
            follower_count: 50000,
            avg_viewers: 2500,
            engagement_rate: 5.2,
            content_niche: ['gaming', 'tech'],
            primary_platform: 'twitch',
            bio: 'Professional gaming streamer and tech enthusiast',
            created_at: new Date().toISOString()
        };
    }

    exitDemoMode() {
        this.isDemoMode = false;
        localStorage.removeItem('demoMode');
        window.location.href = 'index.html';
    }

    async loadProfile() {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', this.user.id)
            .single();

        if (error && error.code === 'PGRST116') {
            // Profile doesn't exist, create it
            await this.createProfile();
        } else {
            this.profile = data;
        }
    }

    async createProfile() {
        // Get Twitch data from user metadata
        const metadata = this.user.user_metadata || {};
        const twitchUsername = metadata.name || metadata.nickname || metadata.preferred_username;
        const fullName = metadata.full_name || metadata.name || twitchUsername;
        
        const { data, error } = await supabase
            .from('profiles')
            .insert([{
                id: this.user.id,
                email: this.user.email,
                username: twitchUsername || this.user.email.split('@')[0],
                full_name: fullName,
                avatar_url: metadata.avatar_url || metadata.picture,
                created_at: new Date().toISOString()
            }])
            .select()
            .single();

        if (error) {
            console.error('Error creating profile:', error);
            return;
        }

        this.profile = data;
        
        // Redirect to onboarding if profile is incomplete
        if (!data.twitch_username || !data.content_niche) {
            window.location.href = 'onboarding.html';
        }
    }

    async updateProfile(updates) {
        if (this.isDemoMode) {
            alert('Cannot save changes in demo mode. Sign up for a real account!');
            return;
        }

        const { data, error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', this.user.id)
            .select()
            .single();

        if (error) {
            console.error('Error updating profile:', error);
            throw error;
        }

        this.profile = data;
        return data;
    }

    async signInWithTwitch() {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'twitch',
            options: {
                redirectTo: window.location.origin + '/sponsorhub/dashboard-real.html'
            }
        });

        if (error) {
            console.error('Error signing in with Twitch:', error);
            throw error;
        }
    }

    async signInWithEmail(email, password) {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;
        return data;
    }

    async signUpWithEmail(email, password, username) {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    username: username
                }
            }
        });

        if (error) throw error;
        return data;
    }

    async signOut() {
        await supabase.auth.signOut();
    }

    isAuthenticated() {
        return this.user !== null || this.isDemoMode;
    }

    getProfile() {
        return this.profile;
    }
}

// Global auth instance
window.authManager = new AuthManager();
