import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  BackHandler,
  ActivityIndicator,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Linking,
  Platform,
} from "react-native";
import { WebView } from "react-native-webview";
import type { WebViewNavigation } from "react-native-webview";
import Constants from "expo-constants";
import * as SplashScreen from "expo-splash-screen";

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
    <View style={styles.root}>
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
        // Loading
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color="#FFD60A" />
            <Text style={styles.loadingText}>Loading Agomon…</Text>
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
        <View style={styles.offline}>
          <Text style={styles.offlineTitle}>You are offline</Text>
          <Text style={styles.offlineSub}>Check your connection and try again.</Text>
          <Text style={styles.offlineUrl} numberOfLines={1}>
            {currentUri}
          </Text>
          <TouchableOpacity onPress={reload} style={styles.retryBtn} activeOpacity={0.8}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
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
  offline: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 24,
    backgroundColor: "#0B1220",
    borderColor: "rgba(255,214,10,0.2)",
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    gap: 6,
  },
  offlineTitle: { color: "#FFD60A", fontWeight: "700", fontSize: 14 },
  offlineSub: { color: "rgba(255,255,255,0.6)", fontSize: 12, textAlign: "center" },
  offlineUrl: { color: "rgba(255,255,255,0.3)", fontSize: 10, marginTop: 4 },
  retryBtn: {
    marginTop: 10,
    backgroundColor: "#FFD60A",
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 999,
  },
  retryText: { color: "#020617", fontWeight: "700", fontSize: 13 },
});
