// Visual theme overrides for DIVE SDK UI
export interface DiveTheme {
  /**
   * Primary accent color for buttons, highlights, progress indicators.
   * Format: '#RRGGBB' or '#RRGGBBAA'. Overrides SDK default (#0067F5).
   */
  accentColor?: string;
  /**
   * Text color on filled buttons (Android only).
   * Format: '#RRGGBB'. If omitted, computed automatically from accentColor
   * using WCAG relative luminance (white for dark backgrounds, black for light).
   */
  onPrimaryColor?: string;
  /**
   * Font size modifier relative to SDK default (0 = no change).
   * iOS: DIVESDKTheme.fontSizeModifier (CGFloat points).
   * Android: applied via fontScale in attachBaseContext.
   */
  fontSizeModifier?: number;
}

// Capture configuration: which documents and steps the SDK should present.
export type DiveRealFaceMode = 'auto' | 'all' | 'none';

export type DiveStepType = 'front' | 'back' | 'pdf' | 'mrz' | 'face';

/**
 * Document type accepted by `launchDive`.
 *
 * `'ID'` is the canonical value going forward. `'DL'` is kept as a
 * backwards-compatible alias for existing integrators — both names work on
 * iOS and Android (the wrapper maps them to the appropriate native enum on
 * Android; the iOS SDK accepts either). Pick one per `documentTypes` entry —
 * you cannot configure the same flow as both DL and ID simultaneously.
 */
export type DiveDocumentType =
  | 'ID'
  | 'DL'
  | 'Passport'
  | 'PassportCard'
  | 'GreenCard'
  | 'InternationalId';

export interface DiveCaptureStepMode {
  uploader: boolean;
  video: boolean;
}

export interface DiveCaptureStep {
  type: DiveStepType;
  name: string;
  mode: DiveCaptureStepMode;
}

export interface DiveDocumentConfig {
  isActive: boolean;
  type: DiveDocumentType;
  steps: DiveCaptureStep[];
}

export interface DiveCaptureConfiguration {
  autoContinue?: boolean;
  autoStart?: boolean;
  autoSubmit?: boolean;
  isShowDocumentTypeSelect?: boolean;
  realFaceMode?: DiveRealFaceMode;
  documentTypes: DiveDocumentConfig[];
}

// Platform-specific options for iOS
export interface DiveIosOptions {
  /** iOS-only: fine-grained capture quality settings */
  captureSettings?: {
    /** Haptic feedback on capture events (default: true) */
    vibroFeedback?: boolean;
    /** Blur rejection threshold 0–1 (default: 0.3) */
    blurThreshold?: number;
    /** Enable DIVE SDK native console logs (default: false) */
    logs?: boolean;
  };
}

/** Reserved for future iOS-only online options */
export interface DiveOnlineIosOptions {}

/** 13 VerificationConfig Boolean flags (Android only) */
export interface DiveAndroidVerificationConfig {
  isOCREnabled?: boolean;
  isAddressCheckEnabled?: boolean;
  isCrossMatchRequired?: boolean;
  isDMVEnabled?: boolean;
  isDMVPartialEnabled?: boolean;
  isIdentiFraudEnabled?: boolean;
  isIdentiFraudFullCaseEnabled?: boolean;
  isDmvOrIdentiFraudEnabled?: boolean;
  isDmvAndIdentiFraudEnabled?: boolean;
  isDmvOrIdentiFraudPartialEnabled?: boolean;
  isDmvAndIdentiFraudPartialEnabled?: boolean;
  isFaceRequiredOnDocument?: boolean;
  faceVerification?: boolean;
}

export interface DiveAndroidOptions {
  /** Android-only: DVS verification mode (default: 'server') */
  verificationMode?: 'server' | 'local' | 'standalone';
  /** Android-only: VerificationConfig flags */
  verificationConfig?: DiveAndroidVerificationConfig;
}

export interface DiveOnlineAndroidOptions {
  /** Android-only: 4th arg of DvsOnlineConfig.Builder (default: 'IDScan') */
  companyPrefix?: string;
}

// Launch options for DIVE SDK (offline mode)
export interface DiveLaunchOptions {
  /** API token (pk_* or sk_* prefixed) */
  token: string;
  /** Base64-encoded license key, bound to bundle ID */
  licenseKey: string;
  /**
   * Capture configuration — which document types and steps to present.
   * Required: must include at least one entry in `documentTypes`.
   */
  configuration: DiveCaptureConfiguration;
  /**
   * Custom DVS base URL (e.g. your stage/QA endpoint).
   * Overrides the value set via configureDiveEnvironment().
   * If omitted, the global environment default is used; if that is also absent, the SDK falls back to the IDScan production endpoint.
   */
  baseUrl?: string;
  /**
   * Custom User-Agent string (Android only; ignored on iOS).
   * Overrides the value set via configureDiveEnvironment().
   */
  userAgent?: string;
  theme?: DiveTheme;
  /** iOS-specific options */
  ios?: DiveIosOptions;
  /** Android-specific options */
  android?: DiveAndroidOptions;
}

// Launch options for DIVE Online SDK
export interface DiveOnlineLaunchOptions {
  /**
   * Public API token (`pk_*`). Secret tokens (`sk_*`) MUST stay on your server —
   * never embed them in the mobile bundle.
   */
  token: string;
  /** Platform-specific integration UUID */
  integrationId: string;
  /** Base URL for DIVE Online API */
  baseUrl: string;
  /**
   * Applicant ID issued by your backend. Your server must create the applicant
   * via `POST {baseUrl}/private/Applicants` (using a secret `sk_*` token) and
   * return the resulting `applicantId` to the mobile client. The SDK never
   * creates applicants on the device.
   */
  applicantId: string;
  theme?: DiveTheme;
  /** iOS-specific options */
  ios?: DiveOnlineIosOptions;
  /** Android-specific options */
  android?: DiveOnlineAndroidOptions;
}

// Discriminated union for SDK results
export type DiveResult =
  | DiveSuccessResult
  | DiveErrorResult
  | DiveCancelledResult;

export interface DiveSuccessResult {
  type: 'success';
  requestKey: string;
  fullResult?: Record<string, unknown>;
}

export interface DiveErrorResult {
  type: 'error';
  code: string;
  message: string;
}

export interface DiveCancelledResult {
  type: 'cancelled';
}

// Upload progress event
export interface DiveUploadProgressEvent {
  progress: number;
}
