// PromoSync Data Service - Handles all database operations

class DataService {
    constructor(supabase) {
        this.supabase = supabase;
    }

    // ========== USER METRICS ==========
    async getUserMetrics(userId) {
        try {
            console.log('📊 Fetching comprehensive metrics for user:', userId);
            
            // Get user_metrics table data
            const { data: metricsData, error: metricsError } = await this.supabase
                .from('user_metrics')
                .select('*')
                .eq('user_id', userId)
                .single();
            
            if (metricsError && metricsError.code !== 'PGRST116') {
                console.error('Error fetching metrics:', metricsError);
            }
            
            // Get deal status breakdown
            const { data: deals } = await this.supabase
                .from('deals')
                .select('status')
                .eq('user_id', userId);
            
            const dealStatus = {
                active: deals?.filter(d => d.status === 'active').length || 0,
                pending: deals?.filter(d => d.status === 'pending').length || 0,
                completed: deals?.filter(d => d.status === 'completed').length || 0,
                cancelled: deals?.filter(d => d.status === 'cancelled').length || 0
            };
            
            // Get application status breakdown
            const { data: apps } = await this.supabase
                .from('applications')
                .select('status')
                .eq('user_id', userId);
            
            const applicationStatus = {
                accepted: apps?.filter(a => a.status === 'accepted').length || 0,
                pending: apps?.filter(a => a.status === 'pending').length || 0,
                rejected: apps?.filter(a => a.status === 'rejected').length || 0
            };
            
            // Get revenue over time (last 30 days)
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            
            const { data: revenue } = await this.supabase
                .from('revenue_records')
                .select('payment_date, amount')
                .eq('user_id', userId)
                .gte('payment_date', thirtyDaysAgo.toISOString().split('T')[0])
                .order('payment_date');
            
            console.log('📈 Revenue records found:', revenue?.length || 0);
            
            // Build revenue over time data
            let revenueOverTime = { labels: [], data: [] };
            if (revenue && revenue.length > 0) {
                // Group by week for 30-day view
                const weeklyRevenue = { 'Week 1': 0, 'Week 2': 0, 'Week 3': 0, 'Week 4': 0 };
                
                revenue.forEach(r => {
                    const date = new Date(r.payment_date);
                    const daysAgo = Math.floor((Date.now() - date.getTime()) / (24 * 60 * 60 * 1000));
                    const weekNum = Math.min(3, Math.floor(daysAgo / 7));
                    const weekLabel = `Week ${4 - weekNum}`;
                    weeklyRevenue[weekLabel] = (weeklyRevenue[weekLabel] || 0) + parseFloat(r.amount);
                });
                
                revenueOverTime.labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
                revenueOverTime.data = revenueOverTime.labels.map(w => weeklyRevenue[w] || 0);
            }
            
            // Combine everything
            const result = {
                total_revenue: metricsData?.total_revenue || 0,
                active_deals: metricsData?.active_deals || 0,
                brand_matches: metricsData?.brand_matches || 0,
                avg_deal_value: metricsData?.avg_deal_value || 0,
                applications_sent: metricsData?.applications_sent || 0,
                acceptance_rate: metricsData?.acceptance_rate || 0,
                deal_status: dealStatus,
                application_status: applicationStatus,
                revenue_over_time: revenueOverTime
            };
            
            console.log('✅ Built complete metrics:', result);
            return result;
            
        } catch (error) {
            console.error('❌ getUserMetrics error:', error);
            return {
                total_revenue: 0,
                active_deals: 0,
                brand_matches: 0,
                avg_deal_value: 0,
                applications_sent: 0,
                acceptance_rate: 0,
                deal_status: { active: 0, pending: 0, completed: 0, cancelled: 0 },
                application_status: { accepted: 0, pending: 0, rejected: 0 },
                revenue_over_time: { labels: [], data: [] }
            };
        }
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
// Initialize after supabase loads
if (typeof supabase !== 'undefined') {
    window.dataService = new DataService(supabase);
    console.log('✅ DataService initialized');
}
