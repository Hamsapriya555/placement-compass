# Placement Compass Mobile App

A React Native mobile application for the Placement Compass platform, providing students with data-driven insights about companies for campus placements.

## Features

- **Company Discovery**: Browse and search companies with filtering options
- **Company Analytics**: View detailed statistics about company categories, profitability, remote policies, and more
- **Hiring Process Insights**: Understand the hiring rounds, difficulty levels, and preparation tips for each company
- **InnovX Accelerator**: Explore innovation programs and recommended projects from top companies
- **Dark/Light Theme**: Seamless theme switching based on system preferences
- **Offline Support**: Network status monitoring and offline mode handling
- **Pull-to-Refresh**: Easy data refresh on all list screens

## Tech Stack

- **React Native** with **Expo** - Cross-platform mobile development
- **TypeScript** - Type-safe code
- **React Navigation** - Native-style navigation
- **TanStack React Query** - Server state management and caching
- **Supabase** - Backend data source (same as web app)

## Project Structure

```
mobile-app/
├── src/
│   ├── components/     # Reusable UI components
│   ├── context/        # React contexts (Auth, Theme, Network)
│   ├── hooks/          # Custom hooks for data fetching
│   ├── screens/        # App screens
│   ├── services/       # API services
│   ├── types/          # TypeScript type definitions
│   └── constants/      # App constants
├── App.tsx             # Main app entry point
├── app.json            # Expo configuration
├── tsconfig.json       # TypeScript configuration
└── package.json        # Dependencies
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI
- iOS Simulator (for iOS) or Android Studio (for Android)

### Installation

1. Navigate to the mobile-app directory:
   ```bash
   cd mobile-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

4. Run on your device:
   - Press `i` for iOS simulator
   - Press `a` for Android emulator
   - Scan QR code with Expo Go app on your physical device

## API Integration

The app connects to the same Supabase backend as the web application. Key API endpoints:

- `company_json` - Company data with JSON fields
- `job_role_details_json` - Hiring process and job role information
- `innovx_json` - InnovX accelerator program data

## Configuration

The Supabase connection details are configured in `src/services/api.ts`. Update these values if you need to connect to a different backend:

```typescript
const SUPABASE_URL = 'your-supabase-url';
const SUPABASE_ANON_KEY = 'your-supabase-anon-key';
```

## Development

### Running Tests

```bash
npm test
```

### Linting

```bash
npm run lint
```

### Building for Production

#### iOS

```bash
eas build --platform ios
```

#### Android

```bash
eas build --platform android
```

## Features in Detail

### Dashboard

- Overview statistics (total companies, categories, InnovX programs)
- Quick segment cards for common company categories
- Search functionality across all company data
- Pull-to-refresh for data updates

### Company Detail

- Company overview with logo and key information
- Focus sectors and company metadata
- Hiring process breakdown with round details
- InnovX accelerator information
- Recommended projects with difficulty levels

### Analytics

- Bar chart visualizations for:
  - Category distribution
  - Profitability status
  - Remote work policies
  - Hiring velocity
  - Employee size

### InnovX

- List of companies with innovation programs
- Company strategy insights
- Innovation areas and recommended projects
- Direct navigation to company details

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly on both platforms
5. Submit a pull request

## License

This project is part of the Placement Compass platform.