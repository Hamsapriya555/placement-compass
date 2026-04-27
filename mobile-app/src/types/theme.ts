export interface ThemeColors {
    primary: string;
    primaryForeground: string;
    secondary: string;
    secondaryForeground: string;
    background: string;
    foreground: string;
    card: string;
    cardForeground: string;
    border: string;
    input: string;
    ring: string;
    ringOffset: string;
    muted: string;
    mutedForeground: string;
    accent: string;
    accentForeground: string;
    destructive: string;
    destructiveForeground: string;
    success: string;
    successForeground: string;
    warning: string;
    warningForeground: string;
    info: string;
    infoForeground: string;
}

export interface Theme {
    colors: ThemeColors;
    borderRadius: {
        none: number;
        sm: number;
        default: number;
        md: number;
        lg: number;
        xl: number;
        '2xl': number;
        '3xl': number;
        full: number;
    };
    spacing: {
        px: number;
        0: number;
        0.5: number;
        1: number;
        1.5: number;
        2: number;
        2.5: number;
        3: number;
        3.5: number;
        4: number;
        5: number;
        6: number;
        7: number;
        8: number;
        9: number;
        10: number;
        11: number;
        12: number;
        14: number;
        16: number;
        20: number;
        24: number;
        32: number;
        40: number;
        48: number;
        56: number;
        64: number;
        80: number;
        96: number;
    };
    fontSize: {
        xs: number;
        sm: number;
        base: number;
        lg: number;
        xl: number;
        '2xl': number;
        '3xl': number;
        '4xl': number;
        '5xl': number;
        '6xl': number;
        '7xl': number;
        '8xl': number;
        '9xl': number;
    };
    fontWeight: {
        light: string;
        normal: string;
        medium: string;
        semibold: string;
        bold: string;
    };
    fontFamily: {
        heading: string;
        body: string;
        mono: string;
    };
}

export type ThemeMode = 'light' | 'dark';