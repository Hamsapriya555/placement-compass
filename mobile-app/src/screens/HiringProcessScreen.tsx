import React from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    ActivityIndicator,
    FlatList,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../types/navigation';
import { useTheme } from '../context/ThemeContext';
import { useJobRoleDetails } from '../hooks/useJobRoles';

type Props = StackScreenProps<RootStackParamList, 'HiringProcess'>;

const HiringProcessScreen = ({ route }: Props) => {
    const { companyId, companyName } = route.params;
    const { theme } = useTheme();
    const { data, isLoading } = useJobRoleDetails(companyId);

    if (isLoading) {
        return (
            <View style={[styles.centerContainer, { backgroundColor: theme.colors.background }]}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    if (!data || data.roles.length === 0) {
        return (
            <View style={[styles.centerContainer, { backgroundColor: theme.colors.background }]}>
                <Text style={[styles.errorText, { color: theme.colors.mutedForeground }]}>
                    No hiring process data available
                </Text>
            </View>
        );
    }

    const renderRound = (round: any, index: number) => (
        <View key={index} style={[styles.roundCard, { borderColor: theme.colors.border }]}>
            <View style={styles.roundHeader}>
                <View style={[styles.roundNumber, { backgroundColor: theme.colors.primary }]}>
                    <Text style={[styles.roundNumberText, { color: theme.colors.primaryForeground }]}>
                        {round.round_order}
                    </Text>
                </View>
                <View style={styles.roundInfo}>
                    <Text style={[styles.roundName, { color: theme.colors.foreground }]}>
                        {round.round_name}
                    </Text>
                    {round.round_type && (
                        <Text style={[styles.roundType, { color: theme.colors.mutedForeground }]}>
                            {round.round_type}
                        </Text>
                    )}
                </View>
            </View>

            {round.description && (
                <Text style={[styles.roundDescription, { color: theme.colors.mutedForeground }]}>
                    {round.description}
                </Text>
            )}

            <View style={styles.roundMeta}>
                {round.difficulty_level && (
                    <View
                        style={[
                            styles.difficultyBadge,
                            {
                                backgroundColor:
                                    round.difficulty_level === 'Hard'
                                        ? `${theme.colors.destructive}20`
                                        : round.difficulty_level === 'Medium'
                                            ? `${theme.colors.warning}20`
                                            : `${theme.colors.success}20`,
                            },
                        ]}
                    >
                        <Text
                            style={[
                                styles.difficultyText,
                                {
                                    color:
                                        round.difficulty_level === 'Hard'
                                            ? theme.colors.destructive
                                            : round.difficulty_level === 'Medium'
                                                ? theme.colors.warning
                                                : theme.colors.success,
                                },
                            ]}
                        >
                            {round.difficulty_level}
                        </Text>
                    </View>
                )}
                {round.elimination_rate && (
                    <Text style={[styles.eliminationText, { color: theme.colors.mutedForeground }]}>
                        Elimination: {round.elimination_rate}
                    </Text>
                )}
            </View>

            {round.preparation_focus && (
                <View style={styles.preparationSection}>
                    <Text style={[styles.preparationLabel, { color: theme.colors.mutedForeground }]}>
                        Preparation Focus
                    </Text>
                    <Text style={[styles.preparationText, { color: theme.colors.foreground }]}>
                        {round.preparation_focus}
                    </Text>
                </View>
            )}

            {round.tips && (
                <View style={[styles.tipsSection, { backgroundColor: theme.colors.secondary }]}>
                    <Text style={[styles.tipsLabel, { color: theme.colors.mutedForeground }]}>
                        Pro Tips
                    </Text>
                    <Text style={[styles.tipsText, { color: theme.colors.foreground }]}>
                        {round.tips}
                    </Text>
                </View>
            )}
        </View>
    );

    return (
        <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <View style={styles.header}>
                <Text style={[styles.companyName, { color: theme.colors.foreground }]}>
                    {companyName}
                </Text>
                <Text style={[styles.headerSubtitle, { color: theme.colors.mutedForeground }]}>
                    {data.roles.length} role(s) • {data.roles.reduce((sum, role) => sum + role.rounds.length, 0)} total rounds
                </Text>
            </View>

            {data.roles.map((role, index) => (
                <View key={index} style={styles.roleSection}>
                    <Text style={[styles.roleTitle, { color: theme.colors.foreground }]}>
                        {role.role_title}
                    </Text>
                    {role.rounds.map((round, roundIndex) => renderRound(round, roundIndex))}
                </View>
            ))}

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
    errorText: {
        fontSize: 16,
    },
    header: {
        padding: 16,
        paddingTop: 20,
    },
    companyName: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    headerSubtitle: {
        fontSize: 14,
        marginTop: 4,
    },
    roleSection: {
        marginTop: 16,
        paddingHorizontal: 16,
    },
    roleTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 12,
    },
    roundCard: {
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 12,
    },
    roundHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    roundNumber: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    roundNumberText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    roundInfo: {
        flex: 1,
        marginLeft: 12,
    },
    roundName: {
        fontSize: 16,
        fontWeight: '600',
    },
    roundType: {
        fontSize: 13,
        marginTop: 2,
    },
    roundDescription: {
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 12,
    },
    roundMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
    },
    difficultyBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
    },
    difficultyText: {
        fontSize: 12,
        fontWeight: '600',
    },
    eliminationText: {
        fontSize: 12,
        marginLeft: 12,
    },
    preparationSection: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
    },
    preparationLabel: {
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    preparationText: {
        fontSize: 13,
        lineHeight: 18,
    },
    tipsSection: {
        marginTop: 12,
        padding: 12,
        borderRadius: 8,
    },
    tipsLabel: {
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    tipsText: {
        fontSize: 13,
        lineHeight: 18,
    },
});

export default HiringProcessScreen;