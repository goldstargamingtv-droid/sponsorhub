/**
 * PromoSync Paywall System
 * Manages user tiers, feature gating, and upgrade flows
 */

// Plan definitions
const PLANS = {
    FREE: {
        id: 'free',
        name: 'Free',
        price: 0,
        features: {
            rateCalculator: { save: false, compare: false, history: false },
            mediaKit: { limit: 1, templates: 'basic', customColors: false, dragReorder: false, shareable: false },
            marketplace: { quickApply: 0, saveFavorites: false, priorityMatches: false },
            filters: 'basic',
            analytics: { days: 30, export: false, roi: false },
            contracts: { limit: 3, reminders: false, autoMilestones: false, calendar: false },
            pitchGenerator: { limit: 1, premiumTemplates: false, autoAttach: false },
            notifications: 'basic',
            exports: 'watermarked',
            support: 'community'
        }
    },
    STARTER: {
        id: 'starter',
        name: 'Starter',
        price: 4.99,
        annualPrice: 47.90,
        features: {
            rateCalculator: { save: true, compare: true, history: false },
            mediaKit: { limit: 5, templates: 'all', customColors: true, dragReorder: false, shareable: false },
            marketplace: { quickApply: 10, saveFavorites: true, priorityMatches: false },
            filters: 'standard',
            analytics: { days: 90, export: 'csv', roi: false },
            contracts: { limit: 10, reminders: 'email', autoMilestones: false, calendar: false },
            pitchGenerator: { limit: 10, premiumTemplates: false, autoAttach: false },
            notifications: 'email',
            exports: 'clean',
            support: 'email'
        }
    },
    PRO: {
        id: 'pro',
        name: 'Pro',
        price: 9.99,
        annualPrice: 95.90,
        features: {
            rateCalculator: { save: true, compare: true, history: true },
            mediaKit: { limit: Infinity, templates: 'all', customColors: true, dragReorder: true, shareable: true },
            marketplace: { quickApply: Infinity, saveFavorites: true, priorityMatches: true },
            filters: 'advanced',
            analytics: { days: Infinity, export: 'both', roi: true },
            contracts: { limit: Infinity, reminders: 'both', autoMilestones: true, calendar: true },
            pitchGenerator: { limit: Infinity, premiumTemplates: true, autoAttach: true },
            notifications: 'both',
            exports: 'branded',
            support: 'priority'
        }
    }
};

class PaywallSystem {
    constructor() {
        this.currentPlan = this.loadUserPlan();
        this.usage = this.loadUsage();
        this.init();
    }

    init() {
        // Add plan badge to header
        this.updateHeaderBadge();
        
        // Track usage
        this.trackUsage();
        
        // Add event listeners for gated features
        this.setupGatedFeatures();
    }

    loadUserPlan() {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        return user.plan || 'free';
    }

    saveUserPlan(planId) {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        user.plan = planId;
        localStorage.setItem('user', JSON.stringify(user));
        this.currentPlan = planId;
    }

    loadUsage() {
        const usage = localStorage.getItem('usage');
        if (usage) {
            return JSON.parse(usage);
        }
        
        // Initialize usage tracking
        const now = new Date();
        const monthKey = `${now.getFullYear()}-${now.getMonth() + 1}`;
        
        return {
            month: monthKey,
            mediaKits: 0,
            quickApplies: 0,
            pitches: 0,
            contracts: 0
        };
    }

    saveUsage() {
        localStorage.setItem('usage', JSON.stringify(this.usage));
    }

    trackUsage() {
        // Reset usage if new month
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${now.getMonth() + 1}`;
        
        if (this.usage.month !== currentMonth) {
            this.usage = {
                month: currentMonth,
                mediaKits: 0,
                quickApplies: 0,
                pitches: 0,
                contracts: 0
            };
            this.saveUsage();
        }
    }

    getPlan() {
        return PLANS[this.currentPlan.toUpperCase()];
    }

    canAccess(feature, subFeature = null) {
        const plan = this.getPlan();
        
        if (!plan.features[feature]) return false;
        
        if (subFeature) {
            return plan.features[feature][subFeature];
        }
        
        return true;
    }

    checkLimit(feature) {
        const plan = this.getPlan();
        const limit = plan.features[feature]?.limit;
        
        if (limit === Infinity) return { allowed: true, remaining: Infinity };
        
        const used = this.usage[feature] || 0;
        const remaining = Math.max(0, limit - used);
        
        return {
            allowed: remaining > 0,
            remaining,
            limit,
            used
        };
    }

    incrementUsage(feature) {
        if (!this.usage[feature]) this.usage[feature] = 0;
        this.usage[feature]++;
        this.saveUsage();
    }

    updateHeaderBadge() {
        const plan = this.getPlan();
        const header = document.querySelector('header');
        
        if (!header) return;
        
        // Remove existing badge
        const existingBadge = document.getElementById('plan-badge');
        if (existingBadge) existingBadge.remove();
        
        // Create badge
        const badge = document.createElement('div');
        badge.id = 'plan-badge';
        badge.style.cssText = `
            display: inline-flex;
            align-items: center;
            gap: 12px;
            padding: 8px 16px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid var(--border-color);
            border-radius: 12px;
            font-size: 14px;
            font-weight: 600;
        `;
        
        // Plan name with gradient for Pro
        const planName = document.createElement('span');
        if (plan.id === 'pro') {
            planName.style.cssText = `
                background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                font-weight: 700;
            `;
        }
        planName.textContent = plan.name;
        badge.appendChild(planName);
        
        // Add upgrade button if not Pro
        if (plan.id !== 'pro') {
            const upgradeBtn = document.createElement('button');
            upgradeBtn.textContent = 'Upgrade';
            upgradeBtn.style.cssText = `
                padding: 6px 16px;
                background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
                border: none;
                border-radius: 8px;
                color: white;
                font-weight: 700;
                cursor: pointer;
                transition: all 0.3s;
            `;
            upgradeBtn.onmouseover = () => upgradeBtn.style.transform = 'scale(1.05)';
            upgradeBtn.onmouseout = () => upgradeBtn.style.transform = 'scale(1)';
            upgradeBtn.onclick = () => this.showUpgradeModal();
            badge.appendChild(upgradeBtn);
        }
        
        // Insert before profile
        const headerActions = header.querySelector('.header-actions');
        if (headerActions) {
            headerActions.insertBefore(badge, headerActions.firstChild);
        }
    }

    setupGatedFeatures() {
        // Add lock icons and click handlers to gated elements
        document.querySelectorAll('[data-gated]').forEach(element => {
            const [feature, subFeature] = element.dataset.gated.split(':');
            
            if (!this.canAccess(feature, subFeature)) {
                this.addLockIcon(element);
                element.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.showUpgradeModal(feature, subFeature);
                });
                element.style.cursor = 'pointer';
                element.style.opacity = '0.6';
            }
        });
    }

    addLockIcon(element) {
        const lock = document.createElement('span');
        lock.innerHTML = '🔒';
        lock.style.cssText = `
            position: absolute;
            top: 8px;
            right: 8px;
            font-size: 16px;
            z-index: 10;
        `;
        
        if (element.style.position === '' || element.style.position === 'static') {
            element.style.position = 'relative';
        }
        
        element.appendChild(lock);
    }

    showUpgradeModal(feature = null, subFeature = null) {
        const modal = document.createElement('div');
        modal.id = 'upgrade-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.8);
            backdrop-filter: blur(10px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            animation: fadeIn 0.3s;
        `;
        
        const content = document.createElement('div');
        content.style.cssText = `
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: 24px;
            padding: 48px;
            max-width: 600px;
            width: 90%;
            text-align: center;
            animation: slideUp 0.3s;
        `;
        
        content.innerHTML = `
            <div style="font-size: 48px; margin-bottom: 24px;">🚀</div>
            <h2 style="font-family: 'Syne', sans-serif; font-size: 32px; font-weight: 800; margin-bottom: 16px;">
                Upgrade to Unlock This Feature
            </h2>
            <p style="color: var(--text-secondary); margin-bottom: 32px; font-size: 18px;">
                ${this.getUpgradeMessage(feature, subFeature)}
            </p>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 32px;">
                <div style="background: rgba(255, 255, 255, 0.03); padding: 24px; border-radius: 16px; border: 1px solid var(--border-color);">
                    <h3 style="font-size: 20px; font-weight: 700; margin-bottom: 8px;">Starter</h3>
                    <div style="font-size: 36px; font-weight: 800; margin-bottom: 16px;">$4.99<span style="font-size: 16px; color: var(--text-secondary);">/mo</span></div>
                    <button onclick="window.paywall.upgrade('starter')" style="width: 100%; padding: 12px; background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary)); border: none; border-radius: 12px; color: white; font-weight: 700; cursor: pointer;">
                        Upgrade to Starter
                    </button>
                </div>
                
                <div style="background: linear-gradient(135deg, rgba(0, 217, 255, 0.1), rgba(123, 97, 255, 0.1)); padding: 24px; border-radius: 16px; border: 2px solid var(--accent-primary);">
                    <div style="position: absolute; margin-top: -40px; margin-left: -24px; background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary)); padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: 700;">BEST VALUE</div>
                    <h3 style="font-size: 20px; font-weight: 700; margin-bottom: 8px;">Pro</h3>
                    <div style="font-size: 36px; font-weight: 800; margin-bottom: 16px;">$9.99<span style="font-size: 16px; color: var(--text-secondary);">/mo</span></div>
                    <button onclick="window.paywall.upgrade('pro')" style="width: 100%; padding: 12px; background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary)); border: none; border-radius: 12px; color: white; font-weight: 700; cursor: pointer;">
                        Upgrade to Pro
                    </button>
                </div>
            </div>
            
            <a href="pricing.html" style="color: var(--text-secondary); text-decoration: underline; font-size: 14px;">View full pricing comparison →</a>
        `;
        
        modal.appendChild(content);
        
        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
        
        // Add close button
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '×';
        closeBtn.style.cssText = `
            position: absolute;
            top: 16px;
            right: 16px;
            background: none;
            border: none;
            color: var(--text-secondary);
            font-size: 32px;
            cursor: pointer;
            line-height: 1;
        `;
        closeBtn.onclick = () => modal.remove();
        content.appendChild(closeBtn);
        content.style.position = 'relative';
        
        document.body.appendChild(modal);
    }

    getUpgradeMessage(feature, subFeature) {
        const messages = {
            'rateCalculator:save': 'Save and track your rates over time to optimize your pricing strategy.',
            'mediaKit:templates': 'Access all premium templates and custom color options.',
            'marketplace:quickApply': 'Apply to unlimited brand deals each month.',
            'analytics:export': 'Export your analytics data in CSV and PDF formats.',
            'contracts:calendar': 'View your contracts in a beautiful calendar timeline.',
            'pitchGenerator:limit': 'Generate unlimited AI-powered pitches to close more deals.'
        };
        
        const key = subFeature ? `${feature}:${subFeature}` : feature;
        return messages[key] || 'Unlock premium features to grow your creator business faster.';
    }

    upgrade(planId) {
        // In production, this would redirect to Stripe checkout
        // For now, simulate upgrade
        console.log(`Upgrading to ${planId}...`);
        
        // Show success message
        alert(`Upgrade to ${planId} - Stripe integration coming soon!`);
        
        // For demo, allow upgrade
        if (confirm('Demo mode: Upgrade your account locally?')) {
            this.saveUserPlan(planId);
            window.location.reload();
        }
    }

    showLimitWarning(feature) {
        const limit = this.checkLimit(feature);
        
        alert(`You've used ${limit.used} of ${limit.limit} ${feature} this month.${limit.remaining === 0 ? ' Upgrade to increase your limit!' : ''}`);
        
        if (limit.remaining === 0) {
            this.showUpgradeModal(feature);
        }
    }
}

// Initialize paywall system
window.paywall = new PaywallSystem();

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
    
    @keyframes slideUp {
        from {
            opacity: 0;
            transform: translateY(30px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    .tooltip {
        position: absolute;
        background: var(--bg-secondary);
        border: 1px solid var(--border-color);
        border-radius: 8px;
        padding: 8px 12px;
        font-size: 12px;
        color: var(--text-secondary);
        white-space: nowrap;
        z-index: 1000;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.2s;
    }
    
    .tooltip.show {
        opacity: 1;
    }
`;
document.head.appendChild(style);

// Tooltip system
function addTooltip(element, text) {
    element.addEventListener('mouseenter', (e) => {
        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip show';
        tooltip.textContent = text;
        tooltip.style.top = (e.target.getBoundingClientRect().top - 35) + 'px';
        tooltip.style.left = (e.target.getBoundingClientRect().left) + 'px';
        document.body.appendChild(tooltip);
        
        e.target.tooltipElement = tooltip;
    });
    
    element.addEventListener('mouseleave', (e) => {
        if (e.target.tooltipElement) {
            e.target.tooltipElement.remove();
        }
    });
}

// Export for use in other files
window.addTooltip = addTooltip;

// Initialize paywall system
if (typeof window !== 'undefined') {
    window.paywall = new PaywallSystem();
    
    // Add showPaywall alias for convenience
    window.paywall.showPaywall = function() {
        return this.showUpgradeModal();
    };
    
    console.log('Paywall system initialized');
}
