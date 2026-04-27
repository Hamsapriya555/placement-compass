import React from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    ActivityIndicator,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useCompanyStats } from '../hooks/useCompanies';

const AnalyticsScreen = () => {
    const { theme } = useTheme();
    const { data: stats, isLoading } = useCompanyStats();

    if (isLoading) {
        return (
            <View style={[styles.centerContainer, { backgroundColor: theme.colors.background }]}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    const renderBarChart = (items: { label: string; count: number }[], maxCount: number, color: string) => (
        <View style={styles.chartContainer}>
            {items.slice(0, 8).map((item, index) => (
                <View key={index} style={styles.barRow}>
                    <Text
                        style={[styles.barLabel, { color: theme.colors.mutedForeground }]}
                        numberOfLines={1}
                    >
                        {item.label}
                    </Text>
                    <View style={styles.barTrack}>
                        <View
                            style={[
                                styles.barFill,
                                {
                                    width: `${(item.count / maxCount) * 100}%`,
                                    backgroundColor: color,
                                },
                            ]}
                        />
                    </View>
                    <Text style={[styles.barValue, { color: theme.colors.foreground }]}>
                        {item.count}
                    </Text>
                </View>
            ))}
        </View>
    );

    return (
        <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <View style={styles.header}>
                <Text style={[styles.headerTitle, { color: theme.colors.foreground }]}>
                    Market Analytics
                </Text>
                <Text style={[styles.headerSubtitle, { color: theme.colors.mutedForeground }]}>
                    Overview of {stats?.total || 0} companies
                </Text>
            </View>

            {/* Category Distribution */}
            <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
                <Text style={[styles.sectionTitle, { color: theme.colors.foreground }]}>
                    Category Distribution
                </Text>
                {stats?.byCategory && renderBarChart(stats.byCategory, stats.byCategory[0]?.count || 1, theme.colors.primary)}
            </View>

            {/* Profitability */}
            <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
                <Text style={[styles.sectionTitle, { color: theme.colors.foreground }]}>
                    Profitability Status
                </Text>
                {stats?.byProfitability && renderBarChart(stats.byProfitability, stats.byProfitability[0]?.count || 1, theme.colors.success)}
            </View>

            {/* Remote Policy */}
            <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
                <Text style={[styles.sectionTitle, { color: theme.colors.foreground }]}>
                    Remote Work Policy
                </Text>
                {stats?.byRemotePolicy && renderBarChart(stats.byRemotePolicy, stats.byRemotePolicy[0]?.count || 1, theme.colors.accent)}
            </View>

            {/* Hiring Velocity */}
            <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
                <Text style={[styles.sectionTitle, { color: theme.colors.foreground }]}>
                    Hiring Velocity
                </Text>
                {stats?.byHiringVelocity && renderBarChart(stats.byHiringVelocity, stats.byHiringVelocity[0]?.count || 1, theme.colors.info)}
            </View>

            {/* Employee Size */}
            <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
                <Text style={[styles.sectionTitle, { color: theme.colors.foreground }]}>
                    Employee Size
                </Text>
                {stats?.byEmployeeSize && renderBarChart(stats.byEmployeeSize, stats.byEmployeeSize[0]?.count || 1, theme.colors.warning)}
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
    header: {
        padding: 16,
        paddingTop: 20,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
    },
    headerSubtitle: {
        fontSize: 14,
        marginTop: 4,
    },
    section: {
        margin: 16,
        marginBottom: 0,
        padding: 16,
        borderRadius: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 16,
    },
    chartContainer: {},
    barRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    barLabel: {
        width: 80,
        fontSize: 12,
    },
    barTrack: {
        flex: 1,
        height: 24,
        backgroundColor: 'rgba(128,128,128,0.1)',
        borderRadius: 6,
        overflow: 'hidden',
        marginHorizontal: 8,
    },
    barFill: {
        height: '100%',
        borderRadius: 6,
    },
    barValue: {
        width: 40,
        fontSize: 13,
        fontWeight: '600',
        textAlign: 'right',
    },
});

export default AnalyticsScreen;