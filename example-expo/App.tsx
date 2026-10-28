import { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
  Image,
} from 'react-native';
import {
  launchDive,
  launchDiveOnline,
  addUploadProgressListener,
  configureDiveEnvironment,
  type DiveResult,
  type DiveTheme,
  type DiveCaptureConfiguration,
} from 'react-native-dive-sdk';

// Optional: override the default endpoint or set a custom user agent.
// When baseUrl is omitted, the SDK targets the production endpoint automatically.
// userAgent is Android-only.
configureDiveEnvironment({
  // baseUrl: 'https://dvs.idscan.net/api/v3',
  // userAgent: 'MyApp/1.0',
});

// === Fill these in before running. See example/README.md for instructions. ===

// DIVE SDK — DVS API token + license key issued by IDScan support.
const DIVE_SDK_TOKEN = 'YOUR_DIVE_SDK_TOKEN';
const DIVE_SDK_LICENSE_KEY = 'YOUR_DIVE_SDK_LICENSE_KEY';

// DIVE Online — publishable token (`pk_*`) is safe to ship in the mobile
// bundle. The secret token (`sk_*`) used to create applicants must NEVER
// live on the device in a production build.
const DIVE_ONLINE_TOKEN = 'pk_YOUR_PUBLISHABLE_TOKEN';

// DIVE Online integration UUIDs are per-platform — create one Bundle in the
// portal bound to the iOS bundle id, another bound to the Android applicationId.
const DIVE_ONLINE_INTEGRATION_ID =
  Platform.select({
    ios: 'YOUR_IOS_INTEGRATION_UUID',
    android: 'YOUR_ANDROID_INTEGRATION_UUID',
  }) ?? '';
const DIVE_ONLINE_BASE_URL = 'https://api-diveonline.idscan.net/api/v2';

// In production, fetch the applicantId from your backend each session.
// Your server creates the applicant via:
//   POST {DIVE_ONLINE_BASE_URL}/private/Applicants
//   Authorization: Bearer sk_xxx           <-- SECRET TOKEN, server-only
//   { integrationId, firstName, lastName, phone, email? }
// → returns { applicantId }
//
// Hardcoded here for demo only. Applicant ids are single-use — regenerate
// via your backend (or curl) before each test run.
const DIVE_ONLINE_APPLICANT_ID = 'YOUR_APPLICANT_ID';

const DIVE_CAPTURE_CONFIG: DiveCaptureConfiguration = {
  autoContinue: false,
  autoStart: false,
  autoSubmit: false,
  isShowDocumentTypeSelect: false,
  documentTypes: [
    {
      isActive: true,
      type: 'ID',
      steps: [
        {
          type: 'front',
          name: 'Document Front',
          mode: { uploader: true, video: true },
        },
        { type: 'back', name: 'back', mode: { uploader: true, video: true } },
        { type: 'face', name: 'Face', mode: { uploader: true, video: true } },
      ],
    },
    {
      isActive: true,
      type: 'Passport',
      steps: [
        {
          type: 'front',
          name: 'Document Front',
          mode: { uploader: true, video: true },
        },
        { type: 'face', name: 'Face', mode: { uploader: true, video: true } },
      ],
    },
    {
      isActive: true,
      type: 'PassportCard',
      steps: [
        {
          type: 'front',
          name: 'Document Front',
          mode: { uploader: true, video: true },
        },
        { type: 'mrz', name: 'MRZ', mode: { uploader: true, video: true } },
        { type: 'face', name: 'Face', mode: { uploader: true, video: true } },
      ],
    },
    {
      isActive: true,
      type: 'GreenCard',
      steps: [
        {
          type: 'front',
          name: 'Document Front',
          mode: { uploader: true, video: true },
        },
        { type: 'mrz', name: 'MRZ', mode: { uploader: true, video: true } },
        { type: 'face', name: 'Face', mode: { uploader: true, video: true } },
      ],
    },
    {
      isActive: true,
      type: 'InternationalId',
      steps: [
        {
          type: 'front',
          name: 'Document Front',
          mode: { uploader: true, video: true },
        },
        { type: 'mrz', name: 'MRZ', mode: { uploader: true, video: true } },
        { type: 'face', name: 'Face', mode: { uploader: true, video: true } },
      ],
    },
  ],
};

type Tab = 'offline' | 'online';

function formatFieldName(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

function isBase64Image(value: string): boolean {
  return (
    value.startsWith('data:image/') ||
    (value.length > 200 && /^[A-Za-z0-9+/]+=*$/.test(value))
  );
}

type JsonValue =
  string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

function ResultRow({ label, value }: { label: string; value: JsonValue }) {
  if (value === null || value === undefined || value === '') return null;

  if (typeof value === 'object' && !Array.isArray(value)) {
    const entries = Object.entries(value).filter(
      ([, v]) => v !== null && v !== undefined && v !== ''
    );
    if (entries.length === 0) return null;
    return (
      <View style={resultStyles.group}>
        <Text style={resultStyles.groupLabel}>{label}</Text>
        <View style={resultStyles.groupBody}>
          {entries.map(([k, v]) => (
            <ResultRow
              key={k}
              label={formatFieldName(k)}
              value={v as JsonValue}
            />
          ))}
        </View>
      </View>
    );
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return null;
    return (
      <View style={resultStyles.group}>
        <Text style={resultStyles.groupLabel}>{label}</Text>
        <View style={resultStyles.groupBody}>
          {value.map((item, i) => (
            <ResultRow
              key={i}
              label={`Item ${i + 1}`}
              value={item as JsonValue}
            />
          ))}
        </View>
      </View>
    );
  }

  if (typeof value === 'string' && isBase64Image(value)) {
    const uri = value.startsWith('data:')
      ? value
      : `data:image/jpeg;base64,${value}`;
    return (
      <View style={resultStyles.row}>
        <Text style={resultStyles.rowLabel}>{label}</Text>
        <Image
          source={{ uri }}
          style={resultStyles.image}
          resizeMode="contain"
        />
      </View>
    );
  }

  const display =
    typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value);

  return (
    <View style={resultStyles.row}>
      <Text style={resultStyles.rowLabel}>{label}</Text>
      <Text style={resultStyles.rowValue}>{display}</Text>
    </View>
  );
}

function FullResultView({ data }: { data: Record<string, JsonValue> }) {
  const entries = Object.entries(data).filter(
    ([, v]) => v !== null && v !== undefined && v !== ''
  );
  if (entries.length === 0) return null;
  return (
    <View>
      {entries.map(([key, value]) => (
        <ResultRow key={key} label={formatFieldName(key)} value={value} />
      ))}
    </View>
  );
}

const THEME_PRESETS: {
  label: string;
  theme: DiveTheme | undefined;
  color: string;
}[] = [
  { label: 'Default', theme: undefined, color: '#0067F5' },
  { label: 'Pink', theme: { accentColor: '#E91E63' }, color: '#E91E63' },
  {
    label: 'Green',
    theme: { accentColor: '#4CAF50', onPrimaryColor: '#FFFFFF' },
    color: '#4CAF50',
  },
  {
    label: 'Orange',
    theme: { accentColor: '#FF9800', onPrimaryColor: '#FFFFFF' },
    color: '#FF9800',
  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('offline');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DiveResult | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [selectedThemeIndex, setSelectedThemeIndex] = useState(0);

  const selectedPreset = THEME_PRESETS[selectedThemeIndex]!;

  useEffect(() => {
    const unsubscribe = addUploadProgressListener(({ progress }) => {
      setUploadProgress(progress);
      if (progress >= 1.0) {
        setTimeout(() => setUploadProgress(null), 1000);
      }
    });
    return unsubscribe;
  }, []);

  const handleLaunchDive = async () => {
    console.log('[App] handleLaunchDive: starting');
    setLoading(true);
    setResult(null);
    setUploadProgress(null);
    try {
      const res = await launchDive({
        token: DIVE_SDK_TOKEN,
        licenseKey: DIVE_SDK_LICENSE_KEY,
        configuration: DIVE_CAPTURE_CONFIG,
        theme: selectedPreset.theme,
      });
      console.log(
        '[App] handleLaunchDive: result received, type=',
        res.type,
        JSON.stringify(res)
      );
      setResult(res);
    } catch (e) {
      console.error('[App] handleLaunchDive: unexpected exception', e);
    } finally {
      setLoading(false);
    }
  };

  const handleLaunchDiveOnline = async () => {
    console.log('[App] handleLaunchDiveOnline: starting');
    setLoading(true);
    setResult(null);
    try {
      const res = await launchDiveOnline({
        token: DIVE_ONLINE_TOKEN,
        integrationId: DIVE_ONLINE_INTEGRATION_ID,
        baseUrl: DIVE_ONLINE_BASE_URL,
        applicantId: DIVE_ONLINE_APPLICANT_ID,
        theme: selectedPreset.theme,
      });
      setResult(res);
    } catch (e) {
      console.error('[App] handleLaunchDiveOnline: unexpected exception', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Tab Bar */}
      <View style={[styles.tabBar, { backgroundColor: selectedPreset.color }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'offline' && styles.activeTab]}
          onPress={() => {
            setActiveTab('offline');
            setResult(null);
          }}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'offline' && styles.activeTabText,
            ]}
          >
            DIVE SDK
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'online' && styles.activeTab]}
          onPress={() => {
            setActiveTab('online');
            setResult(null);
          }}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'online' && styles.activeTabText,
            ]}
          >
            DIVE Online
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView contentContainerStyle={styles.content}>
        {/* Theme Picker */}
        <Text style={styles.sectionLabel}>Accent theme</Text>
        <View style={styles.themeRow}>
          {THEME_PRESETS.map((preset, index) => (
            <TouchableOpacity
              key={preset.label}
              style={[
                styles.themeSwatch,
                { backgroundColor: preset.color },
                selectedThemeIndex === index && styles.themeSwatchSelected,
              ]}
              onPress={() => {
                setSelectedThemeIndex(index);
                setResult(null);
              }}
            >
              <Text style={styles.themeSwatchLabel}>{preset.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: selectedPreset.color }]}
          onPress={
            activeTab === 'offline' ? handleLaunchDive : handleLaunchDiveOnline
          }
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Start Verification</Text>
          )}
        </TouchableOpacity>

        {/* Upload Progress */}
        {uploadProgress !== null && (
          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>
              Uploading: {Math.round(uploadProgress * 100)}%
            </Text>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${uploadProgress * 100}%`,
                    backgroundColor: selectedPreset.color,
                  },
                ]}
              />
            </View>
          </View>
        )}

        {/* Result Display */}
        {result && (
          <View style={styles.resultContainer}>
            {result.type === 'success' && result.fullResult ? (
              <>
                <Text style={styles.resultTitle}>Verification Results</Text>
                <FullResultView
                  data={result.fullResult as Record<string, JsonValue>}
                />
              </>
            ) : result.type === 'success' ? (
              <>
                <Text style={styles.resultTitle}>Verification Complete</Text>
                <View style={resultStyles.requestKeyBox}>
                  <Text style={resultStyles.requestKeyLabel}>Request ID</Text>
                  <Text style={resultStyles.requestKeyValue}>
                    {result.requestKey}
                  </Text>
                </View>
                <Text style={resultStyles.requestKeyHint}>
                  Use this Request ID to retrieve full verification results via
                  API.
                </Text>
              </>
            ) : result.type === 'error' ? (
              <>
                <Text style={styles.resultTitle}>Verification Failed</Text>
                <Text style={styles.errorText}>
                  [{result.code}] {result.message}
                </Text>
              </>
            ) : (
              <Text style={styles.resultText}>User cancelled verification</Text>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  tabBar: { flexDirection: 'row' },
  tab: { flex: 1, paddingVertical: 16, alignItems: 'center' },
  activeTab: { borderBottomWidth: 3, borderBottomColor: '#fff' },
  tabText: { color: 'rgba(255,255,255,0.7)', fontSize: 16, fontWeight: '600' },
  activeTabText: { color: '#fff' },
  content: { padding: 20 },
  sectionLabel: {
    fontSize: 13,
    color: '#888',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  themeRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  themeSwatch: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    opacity: 0.75,
  },
  themeSwatchSelected: { opacity: 1, transform: [{ scale: 1.05 }] },
  themeSwatchLabel: { color: '#fff', fontSize: 12, fontWeight: '700' },
  button: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  progressContainer: { marginBottom: 20 },
  progressText: { fontSize: 14, marginBottom: 8, color: '#333' },
  progressBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  resultContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    color: '#333',
  },
  resultText: { fontSize: 14, color: '#555', marginBottom: 4 },
  errorText: { fontSize: 14, color: '#B3261E' },
});

const resultStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  rowLabel: { fontSize: 13, color: '#888', flex: 1, marginRight: 8 },
  rowValue: { fontSize: 13, color: '#222', flex: 2, textAlign: 'right' },
  group: { marginTop: 8 },
  groupLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#555',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  groupBody: {
    paddingLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: '#e0e0e0',
  },
  image: {
    width: '100%',
    height: 120,
    marginTop: 4,
    borderRadius: 6,
    backgroundColor: '#f5f5f5',
  },
  requestKeyBox: {
    backgroundColor: '#f0f4ff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  requestKeyLabel: {
    fontSize: 11,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  requestKeyValue: {
    fontSize: 14,
    color: '#1a1a2e',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  requestKeyHint: { fontSize: 12, color: '#888', lineHeight: 18 },
});
