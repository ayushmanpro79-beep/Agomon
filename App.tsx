import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  BackHandler,
  View,
  StyleSheet,
  StatusBar,
  Linking,
  Platform,
} from "react-native";
import { WebView } from "react-native-webview";
import type { WebViewNavigation } from "react-native-webview";
import Constants from "expo-constants";
import * as SplashScreen from "expo-splash-screen";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  Provider as PaperProvider,
  ActivityIndicator,
  Text,
  Button,
  Card,
  MD3DarkTheme,
} from "react-native-paper";

// Keep splash visible until WebView ready
SplashScreen.preventAutoHideAsync().catch(() => {});

// --- Resolve site URL -----------------------------------------------
// Priority: EXPO_PUBLIC_SITE_URL (EAS env) > app.json extra.siteUrl > fallback
// For local dev: __DEV__ uses 10.0.2.2 (Android emulator) or localhost via adb reverse
const getSiteUrl = (): string => {
  const fromEnv = process.env.EXPO_PUBLIC_SITE_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  const fromExtra = (Constants.expoConfig?.extra as any)?.siteUrl;
  if (fromExtra) return String(fromExtra).replace(/\/$/, "");
  if (__DEV__) {
    // Android emulator maps host 10.0.2.2 -> localhost. For physical device use `adb reverse tcp:3000 tcp:3000` then http://localhost:3000
    return Platform.OS === "android" ? "http://10.0.2.2:3000" : "http://localhost:3000";
  }
  return "https://agomon.vercel.app";
};

const SITE_URL = getSiteUrl();

// Agomon dark theme for React Native Paper (latest MD3) — matches web #020617 / #FFD60A
const agomonTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: "#FFD60A",
    onPrimary: "#020617",
    primaryContainer: "#FFD60A",
    background: "#020617",
    surface: "#0B1220",
    surfaceVariant: "#0B1220",
    outline: "rgba(255,214,10,0.2)",
  },
  roundness: 16,
};

// Lightweight viewport injection: ensure responsive meta, prevent white flash,
// enable smooth scrolling. Keep <5KB.
const INJECTED_JS = `
  (function(){
    var m=document.querySelector('meta[name=viewport]');
    if(!m){m=document.createElement('meta');m.name='viewport';document.head.appendChild(m);}
    m.content='width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover';
    document.documentElement.style.background='#020617';
    // Intercept external schemes if any left
    window.__AGOMON_READY__=true;
  })();
  true;
`;

export default function App() {
  const webRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [offline, setOffline] = useState(false);
  const [currentUri, setCurrentUri] = useState(SITE_URL);

  const onNavChange = useCallback((nav: WebViewNavigation) => {
    setCanGoBack(nav.canGoBack);
    setCurrentUri(nav.url);
    if (nav.loading === false) {
      SplashScreen.hideAsync().catch(() => {});
      setOffline(false);
    }
  }, []);

  // Hardware back button: WebView back else exit (Android)
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (canGoBack && webRef.current) {
        webRef.current.goBack();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [canGoBack]);

  const handleShouldLoad = useCallback(
    (req: { url: string }) => {
      const url = req.url;
      // Allow Site + OSM tiles + Supabase
      if (
        url.startsWith(SITE_URL) ||
        url.startsWith("https://tile.openstreetmap.org") ||
        url.startsWith("https://tiles.stadiamaps.com") ||
        url.startsWith("https://oqqnskvunpjgkkonnuqh.supabase.co") ||
        url.startsWith("https://agomon") ||
        url.startsWith("about:blank") ||
        url.startsWith("data:")
      ) {
        return true;
      }
      // External http(s) -> open browser
      if (url.startsWith("http://") || url.startsWith("https://")) {
        Linking.openURL(url).catch(() => {});
        return false;
      }
      // tel:, mailto:, geo:, intent:
      if (/^(tel:|mailto:|geo:|intent:)/.test(url)) {
        Linking.openURL(url).catch(() => {});
        return false;
      }
      return true;
    },
    []
  );

  const reload = useCallback(() => {
    setOffline(false);
    webRef.current?.reload();
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <PaperProvider theme={agomonTheme}>
        <StatusBar barStyle="light-content" backgroundColor="#020617" translucent={false} />

        <WebView
          ref={webRef}
          source={{ uri: SITE_URL }}
          style={styles.webview}
          // --- Performance / lightweight ---
          cacheEnabled={true}
          cacheMode="LOAD_DEFAULT"
          incognito={false}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          thirdPartyCookiesEnabled={false}
          sharedCookiesEnabled={false}
          allowFileAccess={false}
          allowFileAccessFromFileURLs={false}
          allowUniversalAccessFromFileURLs={false}
          setSupportMultipleWindows={false}
          javaScriptCanOpenWindowsAutomatically={false}
          mixedContentMode="always"
          // Geolocation for "nearby pandal / metro" features
          geolocationEnabled={true}
          // Responsive
          injectedJavaScriptBeforeContentLoaded={INJECTED_JS}
          scalesPageToFit={true}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          overScrollMode="never"
          androidLayerType="hardware"
          // Pull to refresh (native)
          pullToRefreshEnabled={true}
          // Loading — latest Paper ActivityIndicator
          startInLoadingState={true}
          renderLoading={() => (
            <View style={styles.loading}>
              <ActivityIndicator animating size="large" color="#FFD60A" />
              <Text variant="labelSmall" style={styles.loadingText}>
                Loading Agomon…
              </Text>
            </View>
          )}
          onNavigationStateChange={onNavChange}
          onLoadEnd={() => SplashScreen.hideAsync().catch(() => {})}
          onError={() => setOffline(true)}
          onHttpError={() => {}}
          onShouldStartLoadWithRequest={handleShouldLoad}
          // Reduce memory: limit nested scroll
          nestedScrollEnabled={true}
        />

        {offline && (
          <Card style={styles.offlineCard} mode="outlined">
            <Card.Content style={styles.offlineContent}>
              <Text variant="titleSmall" style={styles.offlineTitle}>
                You are offline
              </Text>
              <Text variant="bodySmall" style={styles.offlineSub}>
                Check your connection and try again.
              </Text>
              <Text variant="labelSmall" style={styles.offlineUrl} numberOfLines={1}>
                {currentUri}
              </Text>
              <Button
                mode="contained"
                onPress={reload}
                style={styles.retryBtn}
                buttonColor="#FFD60A"
                textColor="#020617"
                icon="refresh"
              >
                Retry
              </Button>
            </Card.Content>
          </Card>
        )}
      </PaperProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#020617" },
  webview: { flex: 1, backgroundColor: "#020617" },
  loading: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#020617",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: { color: "#FFD60A", fontSize: 12, letterSpacing: 1.2, opacity: 0.8 },
  offlineCard: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 24,
    backgroundColor: "#0B1220",
    borderColor: "rgba(255,214,10,0.2)",
    borderRadius: 16,
  },
  offlineContent: { alignItems: "center", gap: 6, padding: 16 },
  offlineTitle: { color: "#FFD60A", fontWeight: "700", fontSize: 14 },
  offlineSub: { color: "rgba(255,255,255,0.6)", fontSize: 12, textAlign: "center" },
  offlineUrl: { color: "rgba(255,255,255,0.3)", fontSize: 10, marginTop: 4 },
  retryBtn: {
    marginTop: 10,
    borderRadius: 999,
  },
});
