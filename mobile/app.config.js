const plugins = [
  "expo-router",
  "@maplibre/maplibre-react-native",
  [
    "expo-location",
    {
      isIosBackgroundLocationEnabled: true,
      isAndroidBackgroundLocationEnabled: true,
      locationWhenInUsePermission:
        "Location is used to show nearby plans and verify visits.",
      locationAlwaysAndWhenInUsePermission:
        "Background location is used to verify active route progress while a GeoAction is running."
    }
  ],
  "expo-camera",
  "expo-notifications"
];

module.exports = {
  expo: {
    name: "GeoAction Travel",
    slug: "geoaction-travel",
    scheme: "geoaction",
    version: "0.1.0",
    orientation: "portrait",
    userInterfaceStyle: "automatic",
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.geoaction.travel",
      infoPlist: {
        NSCameraUsageDescription:
          "QR codes and field photos are used to verify GeoAction visits.",
        NSLocationWhenInUseUsageDescription:
          "Location is used to show nearby plans and verify visits.",
        NSLocationAlwaysAndWhenInUseUsageDescription:
          "Background location is used to verify active route progress while a GeoAction is running.",
        UIBackgroundModes: ["location", "fetch"]
      }
    },
    android: {
      package: "com.geoaction.travel",
      permissions: [
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.ACCESS_BACKGROUND_LOCATION",
        "android.permission.CAMERA",
        "android.permission.FOREGROUND_SERVICE",
        "android.permission.FOREGROUND_SERVICE_LOCATION",
        "android.permission.POST_NOTIFICATIONS"
      ]
    },
    plugins,
    experiments: {
      typedRoutes: true
    }
  }
};
