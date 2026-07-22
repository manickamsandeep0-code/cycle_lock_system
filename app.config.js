module.exports = {
  expo: {
    name: 'Karunya Cycle Rental',
    slug: 'cycle-rental-app',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff'
    },
    assetBundlePatterns: [
      '**/*'
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.karunya.cyclerental',
      infoPlist: {
        NSLocationAlwaysAndWhenInUseUsageDescription: 'Allow Karunya Cycle Rental to track your location during active rides for live cycle tracking.',
        NSLocationWhenInUseUsageDescription: 'Allow Karunya Cycle Rental to use your location to show nearby cycles.',
        UIBackgroundModes: ['location']
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff'
      },
      package: 'com.karunya.cyclerental',
      permissions: [
        'ACCESS_FINE_LOCATION',
        'ACCESS_COARSE_LOCATION',
        'ACCESS_BACKGROUND_LOCATION',
        'BLUETOOTH',
        'BLUETOOTH_ADMIN',
        'BLUETOOTH_SCAN',
        'BLUETOOTH_CONNECT'
      ],
      versionCode: 1
    },
    web: {
      favicon: './assets/favicon.png'
    },
    scheme: 'cyclerental',
    plugins: [
      'expo-router',
      [
        'expo-location',
        {
          locationAlwaysAndWhenInUsePermission: 'Allow Karunya Cycle Rental to track your location during active rides for live cycle tracking.',
          isAndroidBackgroundLocationEnabled: true,
          isAndroidForegroundServiceEnabled: true
        }
      ]
    ],
    extra: {
      router: {
        origin: false
      },
      eas: {
        projectId: '81cbe65e-cd02-4623-91dc-c5b09eb98e6d'
      }
    }
  },
};