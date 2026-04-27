import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { NetworkProvider } from './src/context/NetworkContext';
import { RootStackParamList } from './src/types/navigation';

import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import CompanyDetailScreen from './src/screens/CompanyDetailScreen';
import AnalyticsScreen from './src/screens/AnalyticsScreen';
import HiringProcessScreen from './src/screens/HiringProcessScreen';
import InnovXScreen from './src/screens/InnovXScreen';

const Stack = createStackNavigator<RootStackParamList>();
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 2,
            refetchOnWindowFocus: false,
        },
    },
});

const AppNavigator = () => {
    const { user, isLoading } = useAuth();
    const { theme, isDark } = useTheme();

    if (isLoading) {
        return (
            <NavigationContainer>
                <StatusBar style={isDark ? 'light' : 'dark'} />
            </NavigationContainer>
        );
    }

    return (
        <NavigationContainer>
            <StatusBar style={isDark ? 'light' : 'dark'} />
            <Stack.Navigator
                screenOptions={{
                    headerStyle: {
                        backgroundColor: theme.colors.background,
                    },
                    headerTitleStyle: {
                        color: theme.colors.foreground,
                    },
                    headerTintColor: theme.colors.primary,
                    cardStyle: {
                        backgroundColor: theme.colors.background,
                    },
                }}
            >
                {!user ? (
                    <Stack.Screen
                        name="Login"
                        component={LoginScreen}
                        options={{ headerShown: false }}
                    />
                ) : (
                    <>
                        <Stack.Screen
                            name="Dashboard"
                            component={DashboardScreen}
                            options={{ title: 'Placement Compass' }}
                        />
                        <Stack.Screen
                            name="CompanyDetail"
                            component={CompanyDetailScreen}
                            options={{ title: 'Company Details' }}
                        />
                        <Stack.Screen
                            name="Analytics"
                            component={AnalyticsScreen}
                            options={{ title: 'Analytics' }}
                        />
                        <Stack.Screen
                            name="HiringProcess"
                            component={HiringProcessScreen}
                            options={{ title: 'Hiring Process' }}
                        />
                        <Stack.Screen
                            name="InnovX"
                            component={InnovXScreen}
                            options={{ title: 'InnovX Accelerator' }}
                        />
                    </>
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
};

export default function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <ThemeProvider>
                <NetworkProvider>
                    <AuthProvider>
                        <AppNavigator />
                    </AuthProvider>
                </NetworkProvider>
            </ThemeProvider>
        </QueryClientProvider>
    );
}