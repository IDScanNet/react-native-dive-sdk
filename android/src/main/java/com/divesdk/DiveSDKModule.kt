package com.divesdk

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import android.util.Log
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.PermissionAwareActivity
import com.facebook.react.modules.core.PermissionListener
import org.json.JSONObject

class DiveSDKModule(
    private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext), ActivityEventListener, PermissionListener {

    companion object {
        const val NAME = "DiveSDKModule"
        private const val DIVE_SDK_REQUEST_CODE = 9001
        private const val CAMERA_PERMISSION_CODE = 9002
        private const val TAG = "DiveSDKModule"
    }

    private var promise: Promise? = null
    private var pendingToken: String? = null
    private var pendingLicenseKey: String? = null
    private var pendingConfigurationJson: String? = null
    private var pendingIntegrationId: String? = null
    private var pendingBaseUrl: String? = null
    private var pendingUserAgent: String? = null
    private var pendingApplicantId: String? = null
    private var pendingThemeBundle: Bundle? = null
    private var pendingOnlineMode: Boolean = false
    private var pendingCompanyPrefix: String? = null
    private var pendingAndroidOptionsBundle: Bundle? = null

    init {
        reactContext.addActivityEventListener(this)
    }

    override fun getName(): String = NAME

    // MARK: - Launch DIVE SDK (Offline)

    @ReactMethod
    fun launchDive(
        token: String,
        licenseKey: String,
        configuration: ReadableMap,
        baseUrl: String?,
        userAgent: String?,
        theme: ReadableMap?,
        iosOptions: ReadableMap?,      // accepted for API symmetry; ignored on Android
        androidOptions: ReadableMap?,  // verificationMode, verificationConfig (used in M1/M2)
        promise: Promise
    ) {
        Log.d(TAG, "launchDive called: baseUrl=$baseUrl, userAgent=$userAgent, hasTheme=${theme != null}")
        this.promise = promise
        this.pendingToken = token
        this.pendingLicenseKey = licenseKey
        this.pendingConfigurationJson = JSONObject(configuration.toHashMap()).toString()
        this.pendingBaseUrl = baseUrl?.takeIf { it.isNotEmpty() }
        this.pendingUserAgent = userAgent?.takeIf { it.isNotEmpty() }
        this.pendingThemeBundle = theme?.toThemeBundle()
        this.pendingAndroidOptionsBundle = androidOptions?.toAndroidOptionsBundle()
        this.pendingOnlineMode = false

        checkCameraPermissionAndLaunch()
    }

    // MARK: - Launch DIVE Online SDK

    @ReactMethod
    fun launchDiveOnline(
        token: String,
        integrationId: String,
        baseUrl: String,
        applicantId: String,
        theme: ReadableMap?,
        iosOptions: ReadableMap?,      // accepted for API symmetry; ignored on Android
        androidOptions: ReadableMap?,  // companyPrefix
        promise: Promise
    ) {
        this.promise = promise
        this.pendingToken = token
        this.pendingIntegrationId = integrationId
        this.pendingBaseUrl = baseUrl
        this.pendingApplicantId = applicantId
        this.pendingThemeBundle = theme?.toThemeBundle()
        this.pendingOnlineMode = true

        val androidMap = androidOptions?.toHashMap()
        this.pendingCompanyPrefix = androidMap?.get("companyPrefix") as? String

        checkCameraPermissionAndLaunch()
    }

    // MARK: - Camera Permission

    private fun checkCameraPermissionAndLaunch() {
        val activity = reactContext.currentActivity ?: run {
            promise?.reject("SDK_ERROR", "No current activity")
            clearPendingState()
            return
        }

        if (ContextCompat.checkSelfPermission(activity, Manifest.permission.CAMERA)
            == PackageManager.PERMISSION_GRANTED
        ) {
            launchDiveSDKActivity()
        } else {
            val permissionAwareActivity = activity as? PermissionAwareActivity
            permissionAwareActivity?.requestPermissions(
                arrayOf(Manifest.permission.CAMERA),
                CAMERA_PERMISSION_CODE,
                this
            )
        }
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<String>,
        grantResults: IntArray
    ): Boolean {
        if (requestCode == CAMERA_PERMISSION_CODE) {
            if (grantResults.isNotEmpty() &&
                grantResults[0] == PackageManager.PERMISSION_GRANTED
            ) {
                launchDiveSDKActivity()
            } else {
                promise?.reject("PERMISSION_DENIED",
                    "Camera permission is required to scan documents")
                clearPendingState()
            }
            return true
        }
        return false
    }

    // MARK: - Launch Activity

    private fun launchDiveSDKActivity() {
        val activity = reactContext.currentActivity ?: run {
            promise?.reject("SDK_ERROR", "No current activity")
            clearPendingState()
            return
        }

        val intent = Intent(activity, DiveSDKActivity::class.java).apply {
            if (pendingOnlineMode) {
                putExtra(DiveSDKActivity.EXTRA_MODE, DiveSDKActivity.MODE_ONLINE)
                putExtra(DiveSDKActivity.EXTRA_TOKEN, pendingToken)
                putExtra(DiveSDKActivity.EXTRA_INTEGRATION_ID, pendingIntegrationId)
                putExtra(DiveSDKActivity.EXTRA_BASE_URL, pendingBaseUrl)
                putExtra(DiveSDKActivity.EXTRA_APPLICANT_ID, pendingApplicantId)
                pendingCompanyPrefix?.let { putExtra(DiveSDKActivity.EXTRA_COMPANY_PREFIX, it) }
            } else {
                putExtra(DiveSDKActivity.EXTRA_MODE, DiveSDKActivity.MODE_OFFLINE)
                putExtra(DiveSDKActivity.EXTRA_TOKEN, pendingToken)
                putExtra(DiveSDKActivity.EXTRA_LICENSE_KEY, pendingLicenseKey)
                putExtra(DiveSDKActivity.EXTRA_CONFIGURATION, pendingConfigurationJson)
                pendingBaseUrl?.let { putExtra(DiveSDKActivity.EXTRA_BASE_URL, it) }
                pendingUserAgent?.let { putExtra(DiveSDKActivity.EXTRA_USER_AGENT, it) }
                pendingAndroidOptionsBundle?.let {
                    putExtra(DiveSDKActivity.EXTRA_ANDROID_OPTIONS, it)
                }
            }
            pendingThemeBundle?.let { putExtra(DiveSDKActivity.EXTRA_THEME, it) }
        }

        DiveSDKActivity.pendingThemeBundleForAttach = pendingThemeBundle
        activity.startActivityForResult(intent, DIVE_SDK_REQUEST_CODE)
    }

    // MARK: - Activity Result

    override fun onActivityResult(
        activity: Activity,
        requestCode: Int,
        resultCode: Int,
        data: Intent?
    ) {
        Log.d(TAG, "onActivityResult: requestCode=$requestCode, resultCode=$resultCode, dataNull=${data == null}")
        if (requestCode != DIVE_SDK_REQUEST_CODE) {
            Log.d(TAG, "onActivityResult: ignoring (not our requestCode)")
            return
        }

        when (resultCode) {
            Activity.RESULT_OK -> {
                val requestKey = data?.getStringExtra(DiveSDKActivity.RESULT_REQUEST_KEY)
                Log.d(TAG, "onActivityResult: RESULT_OK, requestKey=$requestKey")

                @Suppress("UNCHECKED_CAST")
                val fullResult = data?.getSerializableExtra(
                    DiveSDKActivity.RESULT_FULL_RESULT
                ) as? HashMap<String, Any>
                Log.d(TAG, "onActivityResult: fullResult=${if (fullResult != null) fullResult.keys.toString() else "null"}")

                val resultMap = Arguments.createMap().apply {
                    putBoolean("success", true)
                    putString("requestKey", requestKey)
                    if (fullResult != null) {
                        putMap("fullResult", Arguments.makeNativeMap(fullResult as Map<String, Any>))
                    }
                }

                Log.d(TAG, "onActivityResult: resolving promise")
                promise?.resolve(resultMap)
            }
            Activity.RESULT_CANCELED -> {
                val errorCode = data?.getStringExtra(DiveSDKActivity.RESULT_ERROR_CODE)
                    ?: "USER_CANCELLED"
                val errorMessage = data?.getStringExtra(DiveSDKActivity.RESULT_ERROR_MESSAGE)
                    ?: "Operation cancelled"
                Log.d(TAG, "onActivityResult: RESULT_CANCELED, errorCode=$errorCode, errorMessage=$errorMessage")
                promise?.reject(errorCode, errorMessage)
            }
            else -> {
                Log.w(TAG, "onActivityResult: unexpected resultCode=$resultCode")
            }
        }
        clearPendingState()
    }

    override fun onNewIntent(intent: Intent) {}

    private fun clearPendingState() {
        promise = null
        pendingToken = null
        pendingLicenseKey = null
        pendingConfigurationJson = null
        pendingIntegrationId = null
        pendingBaseUrl = null
        pendingUserAgent = null
        pendingApplicantId = null
        pendingThemeBundle = null
        pendingOnlineMode = false
        pendingCompanyPrefix = null
        pendingAndroidOptionsBundle = null
    }

    private fun ReadableMap.toThemeBundle(): Bundle {
        val map = toHashMap()
        return Bundle().apply {
            (map[DiveSDKActivity.EXTRA_THEME_ACCENT] as? String)?.let {
                putString(DiveSDKActivity.EXTRA_THEME_ACCENT, it)
            }
            (map[DiveSDKActivity.EXTRA_THEME_ON_PRIMARY] as? String)?.let {
                putString(DiveSDKActivity.EXTRA_THEME_ON_PRIMARY, it)
            }
            (map[DiveSDKActivity.EXTRA_THEME_FONT_MOD] as? Number)?.let {
                putFloat(DiveSDKActivity.EXTRA_THEME_FONT_MOD, it.toFloat())
            }
        }
    }

    private fun ReadableMap.toAndroidOptionsBundle(): Bundle {
        val map = toHashMap()
        return Bundle().apply {
            (map["verificationMode"] as? String)?.let {
                putString(DiveSDKActivity.EXTRA_VERIFICATION_MODE, it)
            }
            @Suppress("UNCHECKED_CAST")
            (map["verificationConfig"] as? Map<String, Any>)?.let { cfg ->
                val cfgBundle = Bundle()
                cfg.forEach { (key, value) ->
                    if (value is Boolean) cfgBundle.putBoolean(key, value)
                }
                putBundle(DiveSDKActivity.EXTRA_VERIFICATION_CONFIG, cfgBundle)
            }
        }
    }
}
