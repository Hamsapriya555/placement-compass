import React, { useState } from 'react';
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
    Image,
    ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useCompaniesList, useCompanyStats } from '../hooks/useCompanies';
import { useInnovXCount } from '../hooks/useInnovX';
import { useTheme } from '../context/ThemeContext';
import { useNetwork } from '../context/NetworkContext';
import { RootStackParamList } from '../types/navigation';
import { CompanyListItem } from '../types/company';
import { getCompanyLogo } from '../utils/getCompanyLogo';
import { normalizeArray } from '../utils/normalize';

type DashboardNavigationProp = StackNavigationProp<RootStackParamList, 'Dashboard'>;

const TILES = [
    {
        label: 'Tech Giants',
        match: ['Tech Giant', 'Big Tech'],
        icon: '🏢',
        hint: 'Scale + brand',
        color: '#0F766E'
    },
    {
        label: 'Product',
        match: ['Product'],
        icon: '💻',
        hint: 'Engineering depth',
        color: '#D946EF'
    },
    {
        label: 'Service',
        match: ['Service', 'IT Services'],
        icon: '🔧',
        hint: 'Volume hirers',
        color: '#059669'
    },
    {
        label: 'Startups',
        match: ['Startup', 'Scale-up'],
        icon: '🚀',
        hint: 'Early ownership',
        color: '#D97706'
    },
];

const DashboardScreen = () => {
    const navigation = useNavigation<DashboardNavigationProp>();
    const { theme } = useTheme();
    const { isConnected } = useNetwork();
    const [searchQuery, setSearchQuery] = useState('');

    const {
        data: companies,
        isLoading: companiesLoading,
        refetch: refetchCompanies,
    } = useCompaniesList({ q: searchQuery, limit: 8 });

    const { data: stats, isLoading: statsLoading } = useCompanyStats();
    const { data: innovXCount } = useInnovXCount();

    const getHiringCount = () => {
        // This would ideally come from a separate hook, but for now we'll estimate
        return companies?.length || 0;
    };

    const getTileCount = (tile: typeof TILES[0]) => {
        if (!stats?.byCategory) return 0;
        const total = tile.match.reduce((sum, match) => {
            return sum + stats.byCategory
                .filter(c => c.label.toLowerCase().includes(match.toLowerCase()))
                .reduce((s, c) => s + c.count, 0);
        }, 0);
        return total;
    };

    const renderStatCard = (label: string, value: number, icon: string, color: string) => (
        <View key={label} style={[styles.statCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <View style={[styles.statIcon, { backgroundColor: `${color}20` }]}>
                <Text style={[styles.statIconText, { color }]}>{icon}</Text>
            </View>
            <Text style={[styles.statValue, { color: theme.colors.foreground }]}>{value}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.mutedForeground }]}>{label}</Text>
        </View>
    );

    const renderTileCard = (tile: typeof TILES[0], index: number) => {
        const count = getTileCount(tile);
        return (
            <TouchableOpacity
                key={index}
                style={[styles.tileCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                onPress={() => navigation.navigate('Analytics')}
            >
                <View style={styles.tileHeader}>
                    <View style={[styles.tileIcon, { backgroundColor: `${tile.color}20` }]}>
                        <Text style={[styles.tileIconText, { color: tile.color }]}>{tile.icon}</Text>
                    </View>
                    <Text style={[styles.tileCount, { color: theme.colors.foreground }]}>{count}</Text>
                </View>
                <View style={styles.tileContent}>
                    <Text style={[styles.tileLabel, { color: theme.colors.foreground }]}>{tile.label}</Text>
                    <Text style={[styles.tileHint, { color: theme.colors.mutedForeground }]}>{tile.hint}</Text>
                </View>
                <View style={styles.tileFooter}>
                    <Text style={[styles.tileFooterText, { color: theme.colors.primary }]}>
                        Explore Segments →
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    const renderDistributionCard = () => (
        <View style={[styles.distributionCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <View style={styles.distributionHeader}>
                <Text style={[styles.distributionTitle, { color: theme.colors.foreground }]}>
                    Remote / hybrid / on-site
                </Text>
                <View style={[styles.liveBadge, { backgroundColor: theme.colors.secondary }]}>
                    <Text style={[styles.liveBadgeText, { color: theme.colors.mutedForeground }]}>
                        Live View
                    </Text>
                </View>
            </View>
            <View style={styles.distributionContent}>
                {statsLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                        <View key={i} style={[styles.distributionRow, { backgroundColor: theme.colors.secondary }]} />
                    ))
                ) : stats?.byRemotePolicy && stats.byRemotePolicy.length > 0 ? (
                    stats.byRemotePolicy.slice(0, 6).map((item, index) => {
                        const max = Math.max(1, ...stats.byRemotePolicy.map(r => r.count));
                        return (
                            <View key={index} style={styles.distributionRow}>
                                <Text style={[styles.distributionLabel, { color: theme.colors.foreground }]}>
                                    {item.label}
                                </Text>
                                <View style={styles.distributionBar}>
                                    <View
                                        style={[
                                            styles.distributionFill,
                                            {
                                                backgroundColor: theme.colors.primary,
                                                width: `${(item.count / max) * 100}%`
                                            }
                                        ]}
                                    />
                                </View>
                                <Text style={[styles.distributionValue, { color: theme.colors.foreground }]}>
                                    {item.count}
                                </Text>
                            </View>
                        );
                    })
                ) : (
                    <View style={[styles.emptyDistribution, { backgroundColor: theme.colors.secondary }]}>
                        <Text style={[styles.emptyDistributionText, { color: theme.colors.mutedForeground }]}>
                            Aggregating data points...
                        </Text>
                    </View>
                )}
            </View>
        </View>
    );

    const renderCompanyCard = ({ item }: { item: CompanyListItem }) => (
        <TouchableOpacity
            key={item.id}
            style={[styles.companyCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
            onPress={() => navigation.navigate('CompanyDetail', { companyId: item.id })}
        >
            <View style={styles.companyCardHeader}>
                <Image
                    source={{ uri: getCompanyLogo(item) }}
                    style={{ width: 48, height: 48, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: '#fff' }}
                    resizeMode="contain"
                />
                <View style={styles.companyInfo}>
                    <Text style={[styles.companyName, { color: theme.colors.foreground }]} numberOfLines={1}>
                        {item.name}
                    </Text>
                    <Text style={[styles.companyCategory, { color: theme.colors.mutedForeground }]} numberOfLines={1}>
                        {item.category || 'Category not specified'}
                    </Text>
                </View>
            </View>

            {(() => {
                const sectors = normalizeArray(item.focus_sectors);
                if (sectors.length === 0) return null;
                return (
                    <View style={styles.companySectors}>
                        {sectors.slice(0, 2).map((sector, index) => (
                            <View key={index} style={[styles.sectorBadge, { backgroundColor: theme.colors.secondary }]}>
                                <Text style={[styles.sectorBadgeText, { color: theme.colors.mutedForeground }]} numberOfLines={1}>
                                    {sector}
                                </Text>
                            </View>
                        ))}
                        {sectors.length > 2 && (
                            <View style={[styles.sectorBadge, { backgroundColor: theme.colors.secondary }]}>
                                <Text style={[styles.sectorBadgeText, { color: theme.colors.mutedForeground }]}>
                                    +{sectors.length - 2}
                                </Text>
                            </View>
                        )}
                    </View>
                );
            })()}

            <View style={styles.companyMeta}>
                <Text style={[styles.metaText, { color: theme.colors.mutedForeground }]}>
                    👥 {item.employee_count ? item.employee_count.toLocaleString() : (item.employee_size || 'Data not available')}
                </Text>
                <Text style={[styles.metaText, { color: theme.colors.mutedForeground }]}>
                    📈 {item.hiring_velocity || 'Data not available'}
                </Text>
                <Text style={[styles.metaText, { color: theme.colors.mutedForeground }]} numberOfLines={1}>
                    📍 {item.location || 'Location not specified'}
                </Text>
            </View>
        </TouchableOpacity>
    );

    if (!isConnected) {
        return (
            <View style={[styles.centerContainer, { backgroundColor: theme.colors.background }]}>
                <Text style={[styles.offlineText, { color: theme.colors.mutedForeground }]}>
                    You're offline. Some features may be limited.
                </Text>
            </View>
        );
    }

    return (
        <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            {/* Hero Section */}
            <View style={styles.heroSection}>
                <View style={styles.badge}>
                    <Text style={[styles.badgeText, { color: theme.colors.primary }]}>
                        ✨ Placement Intelligence Dashboard
                    </Text>
                </View>
                <Text style={[styles.heroTitle, { color: theme.colors.foreground }]}>
                    Decide which companies to target — using data, not anecdotes.
                </Text>

                {/* Search Bar */}
                <View style={[styles.searchContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                    <Text style={[styles.searchIcon, { color: theme.colors.mutedForeground }]}>🔍</Text>
                    <TextInput
                        style={[styles.searchInput, { color: theme.colors.foreground }]}
                        placeholder="Search company name, category or focus area…"
                        placeholderTextColor={theme.colors.mutedForeground}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    <TouchableOpacity style={[styles.searchButton, { backgroundColor: theme.colors.primary }]}>
                        <Text style={[styles.searchButtonText, { color: theme.colors.primaryForeground }]}>
                            Explore Intelligence →
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Stats Grid */}
            <View style={styles.statsGrid}>
                {renderStatCard('Companies tracked', stats?.total || 0, '🏢', theme.colors.primary)}
                {renderStatCard('Categories', stats?.byCategory?.length || 0, '📊', theme.colors.accent)}
                {renderStatCard('Hiring roles', getHiringCount(), '💼', theme.colors.warning)}
                <TouchableOpacity 
                    key="innovx"
                    style={{ flex: 1 }}
                    onPress={() => navigation.navigate('InnovX')}
                >
                    {renderStatCard('InnovX data', innovXCount || 0, '💡', theme.colors.secondary)}
                </TouchableOpacity>
            </View>

            {/* Rapid Segments */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.foreground }]}>
                        Rapid Segments
                    </Text>
                    <Text style={[styles.sectionSubtitle, { color: theme.colors.mutedForeground }]}>
                        Deep dive into specific institutional hiring categories.
                    </Text>
                </View>
                <View style={styles.tilesGrid}>
                    {TILES.map((tile, index) => renderTileCard(tile, index))}
                </View>
            </View>

            {/* Insight Cards */}
            <View style={styles.section}>
                <View style={styles.insightCards}>
                    {renderDistributionCard()}
                    <View style={[styles.insightCard, { backgroundColor: theme.colors.secondary }]}>
                        <Text style={[styles.insightIcon, { color: theme.colors.accent }]}>💡</Text>
                        <Text style={[styles.insightTitle, { color: theme.colors.foreground }]}>
                            More Insights Pending
                        </Text>
                        <Text style={[styles.insightText, { color: theme.colors.mutedForeground }]}>
                            We are currently processing financial and hiring velocity metrics for the next batch of companies. Check back soon for updated distribution charts.
                        </Text>
                    </View>
                </View>
            </View>

            {/* Search Results / Featured */}
            <View style={styles.section}>
                <View style={styles.resultsHeader}>
                    <View>
                        <Text style={[styles.resultsTitle, { color: theme.colors.foreground }]}>
                            {searchQuery ? "Search results" : "Recently Featured"}
                        </Text>
                        <Text style={[styles.resultsSubtitle, { color: theme.colors.mutedForeground }]}>
                            {searchQuery ? `Showing intelligent matches for "${searchQuery}"` : "The latest intelligence updates from across the platform."}
                        </Text>
                    </View>
                    <TouchableOpacity style={[styles.browseButton, { backgroundColor: theme.colors.secondary }]}>
                        <Text style={[styles.browseButtonText, { color: theme.colors.foreground }]}>
                            Browse Registry →
                        </Text>
                    </TouchableOpacity>
                </View>

                {companiesLoading ? (
                    <View style={styles.loadingGrid}>
                        {Array.from({ length: 4 }).map((_, i) => (
                            <View key={i} style={[styles.loadingSkeleton, { backgroundColor: theme.colors.secondary }]} />
                        ))}
                    </View>
                ) : (companies?.length ?? 0) === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={[styles.emptyTitle, { color: theme.colors.foreground }]}>
                            {searchQuery ? `No companies matched "${searchQuery}"` : "No companies in the database yet"}
                        </Text>
                        <Text style={[styles.emptyDescription, { color: theme.colors.mutedForeground }]}>
                            Load placement records into the public.company table — every screen will populate from the same source of truth.
                        </Text>
                        <TouchableOpacity style={[styles.tryButton, { backgroundColor: theme.colors.secondary }]}>
                            <Text style={[styles.tryButtonText, { color: theme.colors.foreground }]}>
                                Try comparison view
                            </Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.companiesGrid}>
                        {companies?.map((item) => renderCompanyCard({ item }))}
                    </View>
                )}
            </View>

            <View style={{ height: 40 }} />
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    offlineText: {
        fontSize: 14,
    },
    heroSection: {
        padding: 16,
        paddingTop: 20,
    },
    badge: {
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        alignSelf: 'flex-start',
        marginBottom: 12,
    },
    badgeText: {
        fontSize: 12,
        fontWeight: '600',
    },
    heroTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        lineHeight: 32,
        marginBottom: 16,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 12,
    },
    searchIcon: {
        fontSize: 16,
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
    },
    searchButton: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        marginLeft: 8,
    },
    searchButtonText: {
        fontSize: 14,
        fontWeight: '600',
    },
    statsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        marginBottom: 24,
    },
    statCard: {
        flex: 1,
        marginHorizontal: 4,
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: 'center',
    },
    statIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    statIconText: {
        fontSize: 20,
    },
    statValue: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    statLabel: {
        fontSize: 11,
        marginTop: 4,
        textAlign: 'center',
    },
    section: {
        paddingHorizontal: 16,
        marginBottom: 20,
    },
    sectionHeader: {
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 4,
    },
    sectionSubtitle: {
        fontSize: 12,
        color: '#6B7280',
    },
    tilesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -4,
    },
    tileCard: {
        width: '48%',
        margin: '1%',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
    },
    tileHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    tileIcon: {
        width: 36,
        height: 36,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    tileIconText: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    tileCount: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    tileContent: {
        marginBottom: 12,
    },
    tileLabel: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 2,
    },
    tileHint: {
        fontSize: 11,
    },
    tileFooter: {
        paddingTop: 8,
        borderTopWidth: 1,
    },
    tileFooterText: {
        fontSize: 12,
        fontWeight: '600',
    },
    insightCards: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -4,
    },
    distributionCard: {
        flex: 1,
        margin: '1%',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
    },
    distributionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    distributionTitle: {
        fontSize: 14,
        fontWeight: '600',
    },
    liveBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    liveBadgeText: {
        fontSize: 10,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    distributionContent: {
        gap: 8,
    },
    distributionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    distributionLabel: {
        flex: 1,
        fontSize: 12,
        fontWeight: '500',
    },
    distributionBar: {
        flex: 1,
        height: 8,
        backgroundColor: 'rgba(156, 163, 175, 0.2)',
        borderRadius: 4,
        overflow: 'hidden',
    },
    distributionFill: {
        height: '100%',
    },
    distributionValue: {
        fontSize: 11,
        fontWeight: '600',
        minWidth: 24,
        textAlign: 'right',
    },
    emptyDistribution: {
        padding: 16,
        borderRadius: 8,
        borderStyle: 'dashed',
        borderWidth: 1,
    },
    emptyDistributionText: {
        fontSize: 12,
        textAlign: 'center',
    },
    insightCard: {
        flex: 1,
        margin: '1%',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
    },
    insightIcon: {
        fontSize: 24,
        marginBottom: 8,
    },
    insightTitle: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 4,
    },
    insightText: {
        fontSize: 11,
        lineHeight: 16,
    },
    resultsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    resultsTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 4,
    },
    resultsSubtitle: {
        fontSize: 12,
        color: '#6B7280',
    },
    browseButton: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
    },
    browseButtonText: {
        fontSize: 11,
        fontWeight: '600',
    },
    loadingGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -4,
    },
    loadingSkeleton: {
        width: '48%',
        margin: '1%',
        height: 120,
        borderRadius: 12,
    },
    emptyState: {
        alignItems: 'center',
        padding: 20,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 8,
    },
    emptyDescription: {
        fontSize: 12,
        textAlign: 'center',
        lineHeight: 18,
        marginBottom: 16,
    },
    tryButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    tryButtonText: {
        fontSize: 12,
        fontWeight: '600',
    },
    companiesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -4,
    },
    companyCard: {
        width: '48%',
        margin: '1%',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
    },
    companyCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    companyLogo: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    companyLogoImage: {
        width: '100%',
        height: '100%',
        borderRadius: 12,
    },
    companyLogoText: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    companyInfo: {
        flex: 1,
        marginLeft: 12,
    },
    companyName: {
        fontSize: 16,
        fontWeight: '600',
    },
    companyCategory: {
        fontSize: 13,
        marginTop: 2,
    },
    companySectors: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 12,
    },
    sectorBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
        marginRight: 6,
        marginBottom: 6,
    },
    sectorBadgeText: {
        fontSize: 11,
    },
    companyMeta: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingTop: 12,
        borderTopWidth: 1,
    },
    metaText: {
        fontSize: 12,
        marginRight: 16,
        marginTop: 4,
    },
});

export default DashboardScreen;
