// PromoSync Data Service - Handles all database operations

class DataService {
    constructor(supabase) {
        this.supabase = supabase;
    }

    // ========== USER METRICS ==========
    async getUserMetrics(userId) {
        const { data, error } = await this.supabase
            .from('user_metrics')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        return data || {
            total_revenue: 0,
            active_deals: 0,
            brand_matches: 0,
            avg_deal_value: 0
        };
    }

    async updateUserMetrics(userId, metrics) {
        const { data, error } = await this.supabase
            .from('user_metrics')
            .upsert({ user_id: userId, ...metrics })
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    // ========== MEDIA KITS ==========
    async getMediaKits(userId) {
        const { data, error } = await this.supabase
            .from('media_kits')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    }

    async saveMediaKit(userId, kitData) {
        const { data, error } = await this.supabase
            .from('media_kits')
            .insert([{
                user_id: userId,
                name: kitData.name,
                template: kitData.template || 'modern',
                data: kitData
            }])
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async updateMediaKit(kitId, kitData) {
        const { data, error } = await this.supabase
            .from('media_kits')
            .update({ data: kitData, name: kitData.name })
            .eq('id', kitId)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async deleteMediaKit(kitId) {
        const { error } = await this.supabase
            .from('media_kits')
            .delete()
            .eq('id', kitId);

        if (error) throw error;
    }

    // ========== SAVED RATES ==========
    async getSavedRates(userId) {
        const { data, error } = await this.supabase
            .from('saved_rates')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(10);

        if (error) throw error;
        return data || [];
    }

    async saveRate(userId, rateData) {
        const { data, error } = await this.supabase
            .from('saved_rates')
            .insert([{
                user_id: userId,
                followers: rateData.followers,
                avg_viewers: rateData.avgViewers,
                engagement_rate: rateData.engagementRate,
                niche: rateData.niche,
                platform: rateData.platform,
                calculated_rate: rateData.calculatedRate
            }])
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    // ========== PITCHES ==========
    async getPitches(userId) {
        const { data, error } = await this.supabase
            .from('pitches')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    }

    async savePitch(userId, pitchData) {
        const { data, error } = await this.supabase
            .from('pitches')
            .insert([{
                user_id: userId,
                brand_name: pitchData.brandName,
                template: pitchData.template,
                pitch_text: pitchData.pitchText
            }])
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    // ========== CONTRACTS ==========
    async getContracts(userId) {
        const { data, error } = await this.supabase
            .from('contracts')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    }

    async getActiveContracts(userId) {
        const { data, error } = await this.supabase
            .from('contracts')
            .select('*')
            .eq('user_id', userId)
            .eq('status', 'active')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    }

    async createContract(userId, contractData) {
        const { data, error } = await this.supabase
            .from('contracts')
            .insert([{
                user_id: userId,
                brand_name: contractData.brandName,
                deal_value: contractData.dealValue,
                status: contractData.status || 'pending',
                start_date: contractData.startDate,
                end_date: contractData.endDate
            }])
            .select()
            .single();

        if (error) throw error;
        
        // Update metrics after creating contract
        await this.recalculateMetrics(userId);
        
        return data;
    }

    async updateContractStatus(contractId, status) {
        const { data, error } = await this.supabase
            .from('contracts')
            .update({ status })
            .eq('id', contractId)
            .select()
            .single();

        if (error) throw error;
        
        // Recalculate metrics
        const contract = data;
        await this.recalculateMetrics(contract.user_id);
        
        return data;
    }

    // ========== PROFILES ==========
    async getProfile(userId) {
        const { data, error } = await this.supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        return data;
    }

    async updateProfile(userId, updates) {
        const { data, error } = await this.supabase
            .from('profiles')
            .update(updates)
            .eq('id', userId)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    // ========== METRICS CALCULATION ==========
    async recalculateMetrics(userId) {
        const contracts = await this.getContracts(userId);
        
        const activeDeals = contracts.filter(c => c.status === 'active').length;
        const completedContracts = contracts.filter(c => c.status === 'completed');
        const totalRevenue = completedContracts.reduce((sum, c) => sum + parseFloat(c.deal_value || 0), 0);
        const avgDealValue = completedContracts.length > 0 
            ? totalRevenue / completedContracts.length 
            : 0;

        await this.updateUserMetrics(userId, {
            total_revenue: totalRevenue,
            active_deals: activeDeals,
            avg_deal_value: avgDealValue
        });
    }
}

// Make it available globally
window.DataService = DataService;
if (window.supabase) {
    window.dataService = new DataService(window.supabase);
}
