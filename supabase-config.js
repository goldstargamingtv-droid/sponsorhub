// Supabase Configuration
const SUPABASE_URL = 'https://dvbyxtkghbsjiglxjnvt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2Ynl4dGtnaGJzamlnbHhqbnZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2MTMzNjUsImV4cCI6MjA4MTE4OTM2NX0.7Ari03dGk3fQLUIauZZnl21pDrxz7-ImPYR_idaAoyM';

// Create Supabase client
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

class AuthManager {
    constructor() {
        this.user = null;
        this.profile = null;
        this.isDemoMode = false;
    }

    async init() {
        console.log('🔍 AuthManager init started');
        
        // Check for demo mode
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('demo') === 'true' || localStorage.getItem('demoMode') === 'true') {
            this.enableDemoMode();
            return;
        }

        // Check auth state
        console.log('🔍 Checking session...');
        const { data: { session }, error } = await supabaseClient.auth.getSession();
        console.log('📊 Session result:', session ? 'FOUND' : 'NONE', error);
        
        if (session) {
            console.log('✅ Session exists, user:', session.user.email);
            this.user = session.user;
            await this.loadProfile();
        } else {
            console.log('❌ No session found');
        }

        // Listen for auth changes
        supabaseClient.auth.onAuthStateChange((event, session) => {
            console.log('🔔 Auth event:', event, session ? 'with session' : 'no session');
            
            if (event === 'SIGNED_IN') {
                console.log('✅ SIGNED_IN event, user:', session.user.email);
                this.user = session.user;
                this.loadProfile().then(() => {
                    console.log('➡️ Redirecting to dashboard');
                    window.location.href = '/sponsorhub/dashboard-real.html';
                });
            } else if (event === 'SIGNED_OUT') {
                this.user = null;
                this.profile = null;
                window.location.href = '/sponsorhub/index.html';
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
        window.location.href = '/sponsorhub/index.html';
    }

    async loadProfile() {
        console.log('📂 Loading profile for user:', this.user.id);
        
        const { data, error } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', this.user.id)
            .single();

        if (error && error.code === 'PGRST116') {
            console.log('⚠️ Profile not found, creating new profile...');
            await this.createProfile();
        } else if (error) {
            console.error('❌ Error loading profile:', error);
        } else {
            console.log('✅ Profile loaded:', data);
            this.profile = data;
        }
    }

    async createProfile() {
        console.log('🆕 Creating profile...');
        
        // Get Twitch data from user metadata
        const metadata = this.user.user_metadata || {};
        const twitchUsername = metadata.name || metadata.nickname || metadata.preferred_username;
        const fullName = metadata.full_name || metadata.name || twitchUsername;
        
        const { data, error } = await supabaseClient
            .from('profiles')
            .insert([{
                id: this.user.id,
                username: twitchUsername || this.user.email.split('@')[0],
                full_name: fullName,
                avatar_url: metadata.avatar_url || metadata.picture,
                created_at: new Date().toISOString()
            }])
            .select()
            .single();

        if (error) {
            console.error('❌ Error creating profile:', error);
            alert('Error creating profile: ' + error.message);
            return;
        }

        console.log('✅ Profile created:', data);
        this.profile = data;
    }

    async updateProfile(updates) {
        if (this.isDemoMode) {
            alert('Cannot save changes in demo mode. Sign up for a real account!');
            return;
        }

        const { data, error } = await supabaseClient
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
        console.log('🎮 Starting Twitch OAuth...');
        
        const { data, error } = await supabaseClient.auth.signInWithOAuth({
            provider: 'twitch',
            options: {
                redirectTo: 'https://goldstargamingtv-droid.github.io/sponsorhub/dashboard-real.html'
            }
        });

        console.log('🎮 OAuth response:', data, error);

        if (error) {
            console.error('❌ Error signing in with Twitch:', error);
            throw error;
        }
    }

    async signInWithYouTube() {
        console.log('▶️ Starting YouTube OAuth...');
        
        const { data, error } = await supabaseClient.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: 'https://goldstargamingtv-droid.github.io/sponsorhub/dashboard-real.html',
                scopes: 'https://www.googleapis.com/auth/youtube.readonly'
            }
        });

        console.log('▶️ OAuth response:', data, error);

        if (error) {
            console.error('❌ Error signing in with YouTube:', error);
            throw error;
        }
    }

    async signInWithEmail(email, password) {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;
        return data;
    }

    async signUpWithEmail(email, password, username) {
        const { data, error } = await supabaseClient.auth.signUp({
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
        await supabaseClient.auth.signOut();
    }

    isAuthenticated() {
        return this.user !== null || this.isDemoMode;
    }

    getProfile() {
        return this.profile;
    }
}

console.log('🚀 Creating AuthManager instance');
window.authManager = new AuthManager();

// Export supabase client globally for other scripts
window.supabase = supabaseClient;
