import React from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    Image,
    ActivityIndicator,
    TouchableOpacity,
    Linking,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useCompanyDetail } from '../hooks/useCompanies';
import { useJobRoleDetails } from '../hooks/useJobRoles';
import { useInnovX } from '../hooks/useInnovX';
import { useTheme } from '../context/ThemeContext';
import { RootStackParamList } from '../types/navigation';
import { getCompanyLogo } from '../utils/getCompanyLogo';
import { normalizeArray } from '../utils/normalize';

type CompanyDetailRouteProp = RouteProp<RootStackParamList, 'CompanyDetail'>;
type CompanyDetailNavigationProp = StackNavigationProp<RootStackParamList, 'CompanyDetail'>;

const CompanyDetailScreen = () => {
    const route = useRoute<CompanyDetailRouteProp>();
    const navigation = useNavigation<CompanyDetailNavigationProp>();
    const { companyId } = route.params;
    const { theme } = useTheme();

    const { data: company, isLoading: companyLoading } = useCompanyDetail(companyId);
    const { data: jobRoles } = useJobRoleDetails(companyId);
    const { data: innovX } = useInnovX(companyId);

    if (companyLoading) {
        return (
            <View style={[styles.centerContainer, { backgroundColor: theme.colors.background }]}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    if (!company) {
        return (
            <View style={[styles.centerContainer, { backgroundColor: theme.colors.background }]}>
                <Text style={[styles.errorText, { color: theme.colors.mutedForeground }]}>
                    Company not found
                </Text>
            </View>
        );
    }

    return (
        <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: theme.colors.card }]}> 
                <Image
                    source={{ uri: getCompanyLogo(company) }}
                    style={{ width: 72, height: 72, borderRadius: 18, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: '#fff' }}
                    resizeMode="contain"
                />
                <View style={styles.headerInfo}>
                    <Text style={[styles.companyName, { color: theme.colors.foreground }]}> 
                        {company.name}
                    </Text>
                    {company.short_name && (
                        <Text style={[styles.shortName, { color: theme.colors.mutedForeground }]}>
                            {company.short_name}
                        </Text>
                    )}
                    <View style={styles.metaRow}>
                        {company.category && (
                            <Text style={[styles.metaText, { color: theme.colors.mutedForeground }]}>
                                {company.category}
                            </Text>
                        )}
                        {company.employee_size && (
                            <Text style={[styles.metaText, { color: theme.colors.mutedForeground }]}>
                                · {company.employee_size}
                            </Text>
                        )}
                    </View>
                </View>
            </View>

            {/* Focus Sectors */}
            {(() => {
                const sectors = normalizeArray(company.focus_sectors);
                if (sectors.length === 0) return null;
                return (
                    <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
                        <Text style={[styles.sectionTitle, { color: theme.colors.foreground }]}>
                            Focus Sectors
                        </Text>
                        <View style={styles.badgesContainer}>
                            {sectors.map((sector, index) => (
                                <View
                                    key={index}
                                    style={[
                                        styles.badge,
                                        { backgroundColor: theme.colors.secondary, borderColor: theme.colors.border },
                                    ]}
                                >
                                    <Text style={[styles.badgeText, { color: theme.colors.foreground }]}>
                                        {sector}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    </View>
                );
            })()}

            {/* Hiring Process */}
            {jobRoles && jobRoles.roles.length > 0 && (
                <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.foreground }]}>
                        Hiring Process
                    </Text>
                    {jobRoles.roles.map((role, index) => (
                        <View key={index} style={[styles.roleCard, { borderColor: theme.colors.border }]}>
                            <Text style={[styles.roleTitle, { color: theme.colors.foreground }]}>
                                {role.role_title}
                            </Text>
                            {role.compensation && (
                                <Text style={[styles.roleCompensation, { color: theme.colors.mutedForeground }]}>
                                    {role.compensation}
                                    {role.ctc_or_stipend && ` - ₹${(role.ctc_or_stipend / 100000).toFixed(1)} LPA`}
                                </Text>
                            )}
                            {role.rounds.length > 0 && (
                                <View style={styles.roundsContainer}>
                                    {role.rounds.slice(0, 3).map((round, roundIndex) => (
                                        <View key={roundIndex} style={styles.roundItem}>
                                            <Text style={[styles.roundName, { color: theme.colors.mutedForeground }]}>
                                                {roundIndex + 1}. {round.round_name}
                                            </Text>
                                        </View>
                                    ))}
                                    {role.rounds.length > 3 && (
                                        <Text style={[styles.moreRounds, { color: theme.colors.mutedForeground }]}>
                                            +{role.rounds.length - 3} more rounds
                                        </Text>
                                    )}
                                </View>
                            )}
                        </View>
                    ))}
                    <TouchableOpacity
                        style={[styles.viewFullButton, { backgroundColor: theme.colors.primary }]}
                        onPress={() => navigation.navigate('HiringProcess', {
                            companyId: company.id,
                            companyName: company.name
                        })}
                    >
                        <Text style={[styles.viewFullButtonText, { color: theme.colors.primaryForeground }]}>
                            View Full Timeline →
                        </Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* InnovX Section */}
            {innovX && (
                <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.foreground }]}>
                        InnovX Accelerator
                    </Text>
                    {innovX.data.company_strategy && (
                        <View style={[styles.strategyCard, { backgroundColor: theme.colors.secondary }]}>
                            <Text style={[styles.strategyLabel, { color: theme.colors.mutedForeground }]}>
                                Company Strategy
                            </Text>
                            <Text style={[styles.strategyText, { color: theme.colors.foreground }]}>
                                {innovX.data.company_strategy}
                            </Text>
                        </View>
                    )}
                    {(() => {
                        const areas = normalizeArray(innovX.data.innovation_areas);
                        if (areas.length === 0) return null;
                        return (
                            <View style={styles.innovationSection}>
                                <Text style={[styles.innovationLabel, { color: theme.colors.mutedForeground }]}>
                                    Innovation Areas
                                </Text>
                                <View style={styles.badgesContainer}>
                                    {areas.map((area, index) => (
                                        <View
                                            key={index}
                                            style={[
                                                styles.badge,
                                                { backgroundColor: `${theme.colors.accent}20`, borderColor: `${theme.colors.accent}40` },
                                            ]}
                                        >
                                            <Text style={[styles.badgeText, { color: theme.colors.accent }]}>
                                                {area}
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        );
                    })()}
                    {innovX.data.recommended_projects.length > 0 && (
                        <View style={styles.projectsSection}>
                            <Text style={[styles.projectsLabel, { color: theme.colors.mutedForeground }]}>
                                Recommended Projects
                            </Text>
                            {innovX.data.recommended_projects.slice(0, 2).map((project, index) => (
                                <View
                                    key={index}
                                    style={[styles.projectCard, { borderColor: theme.colors.border }]}
                                >
                                    <View style={styles.projectHeader}>
                                        <Text style={[styles.projectTitle, { color: theme.colors.foreground }]}>
                                            {project.title}
                                        </Text>
                                        <View
                                            style={[
                                                styles.difficultyBadge,
                                                {
                                                    backgroundColor:
                                                        project.difficulty === 'Hard'
                                                            ? `${theme.colors.destructive}20`
                                                            : project.difficulty === 'Medium'
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
                                                            project.difficulty === 'Hard'
                                                                ? theme.colors.destructive
                                                                : project.difficulty === 'Medium'
                                                                    ? theme.colors.warning
                                                                    : theme.colors.success,
                                                    },
                                                ]}
                                            >
                                                {project.difficulty}
                                            </Text>
                                        </View>
                                    </View>
                                    {project.description && (
                                        <Text
                                            style={[styles.projectDescription, { color: theme.colors.mutedForeground }]}
                                            numberOfLines={2}
                                        >
                                            {project.description}
                                        </Text>
                                    )}
                                </View>
                            ))}
                        </View>
                    )}
                </View>
            )}

            {/* Additional Info */}
            <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
                <Text style={[styles.sectionTitle, { color: theme.colors.foreground }]}>
                    Additional Information
                </Text>
                {company.description && (
                    <View style={styles.infoRow}>
                        <Text style={[styles.infoLabel, { color: theme.colors.mutedForeground }]}>
                            Description
                        </Text>
                        <Text style={[styles.infoValue, { color: theme.colors.foreground }]}>
                            {company.description}
                        </Text>
                    </View>
                )}
                {company.headquarters_address && (
                    <View style={styles.infoRow}>
                        <Text style={[styles.infoLabel, { color: theme.colors.mutedForeground }]}>
                            Headquarters
                        </Text>
                        <Text style={[styles.infoValue, { color: theme.colors.foreground }]}>
                            {company.headquarters_address}
                        </Text>
                    </View>
                )}
                {company.website && (
                    <TouchableOpacity 
                        style={styles.linkButton}
                        onPress={() => Linking.openURL(company.website!).catch(() => {})}
                    >
                        <Text style={[styles.linkText, { color: theme.colors.primary }]}>
                            Visit Website
                        </Text>
                    </TouchableOpacity>
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
    errorText: {
        fontSize: 16,
    },
    header: {
        flexDirection: 'row',
        padding: 16,
        paddingTop: 20,
        borderBottomWidth: 1,
    },
    logoContainer: {
        width: 72,
        height: 72,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    logo: {
        width: '100%',
        height: '100%',
        borderRadius: 16,
    },
    logoText: {
        fontSize: 28,
        fontWeight: 'bold',
    },
    headerInfo: {
        flex: 1,
        marginLeft: 16,
        justifyContent: 'center',
    },
    companyName: {
        fontSize: 22,
        fontWeight: 'bold',
    },
    shortName: {
        fontSize: 14,
        marginTop: 2,
    },
    metaRow: {
        flexDirection: 'row',
        marginTop: 4,
    },
    metaText: {
        fontSize: 13,
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
        marginBottom: 12,
    },
    badgesContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    badge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        marginRight: 8,
        marginBottom: 8,
        borderWidth: 1,
    },
    badgeText: {
        fontSize: 12,
    },
    roleCard: {
        padding: 12,
        borderWidth: 1,
        borderRadius: 12,
        marginBottom: 8,
    },
    roleTitle: {
        fontSize: 16,
        fontWeight: '600',
    },
    roleCompensation: {
        fontSize: 13,
        marginTop: 4,
    },
    roundsContainer: {
        marginTop: 8,
    },
    roundItem: {
        marginBottom: 4,
    },
    roundName: {
        fontSize: 13,
    },
    moreRounds: {
        fontSize: 12,
        marginTop: 4,
    },
    strategyCard: {
        padding: 12,
        borderRadius: 12,
        marginBottom: 12,
    },
    strategyLabel: {
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    strategyText: {
        fontSize: 14,
        marginTop: 4,
        lineHeight: 20,
    },
    innovationSection: {
        marginBottom: 12,
    },
    innovationLabel: {
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 8,
    },
    projectsSection: {},
    projectsLabel: {
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 8,
    },
    projectCard: {
        padding: 12,
        borderWidth: 1,
        borderRadius: 12,
        marginBottom: 8,
    },
    projectHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    projectTitle: {
        fontSize: 14,
        fontWeight: '600',
        flex: 1,
        marginRight: 8,
    },
    difficultyBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    difficultyText: {
        fontSize: 11,
        fontWeight: '600',
    },
    projectDescription: {
        fontSize: 13,
        marginTop: 4,
    },
    infoRow: {
        marginBottom: 12,
    },
    infoLabel: {
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    infoValue: {
        fontSize: 14,
        lineHeight: 20,
    },
    linkButton: {
        marginTop: 8,
    },
    linkText: {
        fontSize: 14,
        fontWeight: '600',
    },
    viewFullButton: {
        marginTop: 12,
        padding: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    viewFullButtonText: {
        fontSize: 14,
        fontWeight: '600',
    },
});

export default CompanyDetailScreen;