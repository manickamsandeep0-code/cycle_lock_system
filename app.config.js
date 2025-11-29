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
      bundleIdentifier: 'com.karunya.cyclerental'
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff'
      },
      package: 'com.karunya.cyclerental',
      permissions: [
        'ACCESS_FINE_LOCATION',
        'ACCESS_COARSE_LOCATION'
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
          locationAlwaysAndWhenInUsePermission: 'Allow Karunya Cycle Rental to use your location to show nearby cycles.'
        }
      ]
    ],
    extra: {
      router: {
        origin: false
      },
      eas: {
        projectId: 'c79c3ffa-658e-4d98-9431-13ba061badf8'
      }
    }
  },
};