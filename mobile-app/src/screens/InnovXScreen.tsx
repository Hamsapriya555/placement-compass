import React from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    FlatList,
    ActivityIndicator,
    TouchableOpacity,
    Linking,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../types/navigation';
import { useTheme } from '../context/ThemeContext';
import { useInnovXIndex } from '../hooks/useInnovX';

type Props = StackScreenProps<RootStackParamList, 'InnovX'>;

const InnovXScreen = ({ navigation }: Props) => {
    const { theme } = useTheme();
    const { data: innovXList, isLoading } = useInnovXIndex();

    const openWebsite = (url: string) => {
        Linking.openURL(url).catch(() => { });
    };

    const renderInnovXCard = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
            onPress={() => navigation.navigate('CompanyDetail', { companyId: item.companyId })}
        >
            <View style={styles.cardHeader}>
                <View style={[styles.companyInitial, { backgroundColor: theme.colors.secondary }]}>
                    <Text style={[styles.initialText, { color: theme.colors.mutedForeground }]}>
                        {item.companyName.charAt(0).toUpperCase()}
                    </Text>
                </View>
                <View style={styles.companyInfo}>
                    <Text style={[styles.companyName, { color: theme.colors.foreground }]} numberOfLines={1}>
                        {item.companyName}
                    </Text>
                    <Text style={[styles.innovationType, { color: theme.colors.mutedForeground }]}>
                        {item.innovationType || 'General'}
                    </Text>
                </View>
            </View>

            {item.data.company_strategy && (
                <View style={styles.strategySection}>
                    <Text style={[styles.strategyLabel, { color: theme.colors.mutedForeground }]}>
                        Strategy
                    </Text>
                    <Text style={[styles.strategyText, { color: theme.colors.foreground }]} numberOfLines={2}>
                        {item.data.company_strategy}
                    </Text>
                </View>
            )}

            {item.data.innovation_areas.length > 0 && (
                <View style={styles.areasSection}>
                    <Text style={[styles.areasLabel, { color: theme.colors.mutedForeground }]}>
                        Innovation Areas
                    </Text>
                    <View style={styles.areasContainer}>
                        {item.data.innovation_areas.slice(0, 3).map((area: string, index: number) => (
                            <View
                                key={index}
                                style={[styles.areaBadge, { backgroundColor: `${theme.colors.accent}20` }]}
                            >
                                <Text style={[styles.areaBadgeText, { color: theme.colors.accent }]}>
                                    {area}
                                </Text>
                            </View>
                        ))}
                        {item.data.innovation_areas.length > 3 && (
                            <View style={[styles.areaBadge, { backgroundColor: theme.colors.secondary }]}>
                                <Text style={[styles.areaBadgeText, { color: theme.colors.mutedForeground }]}>
                                    +{item.data.innovation_areas.length - 3}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
            )}

            {item.data.recommended_projects.length > 0 && (
                <View style={styles.projectsSection}>
                    <Text style={[styles.projectsLabel, { color: theme.colors.mutedForeground }]}>
                        {item.data.recommended_projects.length} Recommended Projects
                    </Text>
                </View>
            )}

            <View style={styles.cardFooter}>
                <Text style={[styles.viewDetails, { color: theme.colors.primary }]}>
                    View Details →
                </Text>
            </View>
        </TouchableOpacity>
    );

    if (isLoading) {
        return (
            <View style={[styles.centerContainer, { backgroundColor: theme.colors.background }]}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <View style={styles.header}>
                <Text style={[styles.headerTitle, { color: theme.colors.foreground }]}>
                    InnovX Accelerator
                </Text>
                <Text style={[styles.headerSubtitle, { color: theme.colors.mutedForeground }]}>
                    {innovXList?.length || 0} companies with innovation programs
                </Text>
            </View>

            <FlatList
                data={innovXList}
                renderItem={renderInnovXCard}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
            />
        </View>
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
    listContent: {
        padding: 16,
        paddingBottom: 40,
    },
    card: {
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 16,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    companyInitial: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    initialText: {
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
    innovationType: {
        fontSize: 13,
        marginTop: 2,
    },
    strategySection: {
        marginBottom: 12,
    },
    strategyLabel: {
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    strategyText: {
        fontSize: 13,
        lineHeight: 18,
    },
    areasSection: {
        marginBottom: 12,
    },
    areasLabel: {
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 6,
    },
    areasContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    areaBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
        marginRight: 6,
        marginBottom: 4,
    },
    areaBadgeText: {
        fontSize: 11,
    },
    projectsSection: {
        marginBottom: 12,
    },
    projectsLabel: {
        fontSize: 12,
        color: '#6B7280',
    },
    cardFooter: {
        marginTop: 8,
        paddingTop: 12,
        borderTopWidth: 1,
    },
    viewDetails: {
        fontSize: 14,
        fontWeight: '600',
    },
});

export default InnovXScreen;