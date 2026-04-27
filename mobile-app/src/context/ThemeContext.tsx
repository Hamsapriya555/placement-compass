import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Theme } from '../types/theme';
import { lightTheme, darkTheme } from '../constants/theme';

interface ThemeContextType {
    theme: Theme;
    themeMode: 'light' | 'dark' | 'system';
    setThemeMode: (mode: 'light' | 'dark' | 'system') => void;
    isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
    theme: lightTheme,
    themeMode: 'light',
    setThemeMode: () => { },
    isDark: false,
});

export const useTheme = () => useContext(ThemeContext);

interface ThemeProviderProps {
    children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
    const systemColorScheme = useColorScheme();
    const [themeMode, setThemeModeState] = useState<'light' | 'dark' | 'system'>('light');
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        const loadThemePreference = async () => {
            try {
                const savedTheme = await AsyncStorage.getItem('themeMode');
                if (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system') {
                    setThemeModeState(savedTheme);
                }
            } catch (error) {
                console.error('Failed to load theme preference:', error);
            }
            setIsLoaded(true);
        };

        loadThemePreference();
    }, []);

    const setThemeMode = async (mode: 'light' | 'dark' | 'system') => {
        try {
            await AsyncStorage.setItem('themeMode', mode);
            setThemeModeState(mode);
        } catch (error) {
            console.error('Failed to save theme preference:', error);
        }
    };

    const isDark = themeMode === 'system' ? systemColorScheme === 'dark' : themeMode === 'dark';
    const theme = isDark ? darkTheme : lightTheme;

    if (!isLoaded) {
        return null;
    }

    return (
        <ThemeContext.Provider value={{ theme, themeMode, setThemeMode, isDark }}>
            {children}
        </ThemeContext.Provider>
    );
};