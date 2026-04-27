import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    ActivityIndicator,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const LoginScreen = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [isLogin, setIsLogin] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const { login, signup } = useAuth();
    const { theme } = useTheme();

    const handleSubmit = async () => {
        setError('');

        if (!email || !password) {
            setError('Please fill in all fields');
            return;
        }

        if (!isLogin && !name) {
            setError('Please enter your name');
            return;
        }

        setIsLoading(true);

        try {
            let success;
            if (isLogin) {
                success = await login(email, password);
            } else {
                success = await signup(email, password, name);
            }

            if (!success) {
                setError(isLogin ? 'Invalid credentials' : 'Signup failed');
            }
        } catch (err) {
            setError('An error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: theme.colors.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.header}>
                    <Text style={[styles.title, { color: theme.colors.foreground }]}>
                        Placement Compass
                    </Text>
                    <Text style={[styles.subtitle, { color: theme.colors.mutedForeground }]}>
                        Decide which companies to target — using data, not anecdotes.
                    </Text>
                </View>

                <View style={[styles.form, { backgroundColor: theme.colors.card }]}>
                    {!isLogin && (
                        <TextInput
                            style={[
                                styles.input,
                                {
                                    backgroundColor: theme.colors.background,
                                    borderColor: theme.colors.border,
                                    color: theme.colors.foreground,
                                },
                            ]}
                            placeholder="Full Name"
                            placeholderTextColor={theme.colors.mutedForeground}
                            value={name}
                            onChangeText={setName}
                            autoCapitalize="words"
                        />
                    )}

                    <TextInput
                        style={[
                            styles.input,
                            {
                                backgroundColor: theme.colors.background,
                                borderColor: theme.colors.border,
                                color: theme.colors.foreground,
                            },
                        ]}
                        placeholder="Email"
                        placeholderTextColor={theme.colors.mutedForeground}
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                    />

                    <TextInput
                        style={[
                            styles.input,
                            {
                                backgroundColor: theme.colors.background,
                                borderColor: theme.colors.border,
                                color: theme.colors.foreground,
                            },
                        ]}
                        placeholder="Password"
                        placeholderTextColor={theme.colors.mutedForeground}
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                    />

                    {error ? <Text style={[styles.error, { color: theme.colors.destructive }]}>{error}</Text> : null}

                    <TouchableOpacity
                        style={[
                            styles.button,
                            { backgroundColor: theme.colors.primary },
                            isLoading && { opacity: 0.7 },
                        ]}
                        onPress={handleSubmit}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <ActivityIndicator color={theme.colors.primaryForeground} />
                        ) : (
                            <Text style={[styles.buttonText, { color: theme.colors.primaryForeground }]}>
                                {isLogin ? 'Sign In' : 'Sign Up'}
                            </Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.toggleButton}
                        onPress={() => setIsLogin(!isLogin)}
                    >
                        <Text style={[styles.toggleText, { color: theme.colors.primary }]}>
                            {isLogin
                                ? "Don't have an account? Sign Up"
                                : 'Already have an account? Sign In'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 24,
    },
    header: {
        alignItems: 'center',
        marginBottom: 32,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        textAlign: 'center',
        maxWidth: 300,
    },
    form: {
        borderRadius: 16,
        padding: 24,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 12,
            },
            android: {
                elevation: 5,
            },
            web: {
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            },
        }),
    },
    input: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 14,
        fontSize: 16,
        marginBottom: 16,
    },
    button: {
        borderRadius: 8,
        padding: 16,
        alignItems: 'center',
        marginTop: 8,
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    toggleButton: {
        marginTop: 16,
        alignItems: 'center',
    },
    toggleText: {
        fontSize: 14,
        fontWeight: '500',
    },
    error: {
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 12,
    },
});

export default LoginScreen;