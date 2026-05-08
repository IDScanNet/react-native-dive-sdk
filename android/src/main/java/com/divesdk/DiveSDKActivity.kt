package com.divesdk

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.content.res.ColorStateList
import android.graphics.Color
import android.os.Bundle
import android.view.View
import android.view.ViewGroup
import android.widget.CompoundButton
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.view.ContextThemeWrapper
import com.google.android.material.button.MaterialButton
import net.idscan.components.android.dvs.*
import net.idscan.components.android.dvs.net.VerificationConfig
import net.idscan.components.android.dvs.net.VerificationRequest
import net.idscan.components.android.dvsonline.DvsOnlineConfig
import net.idscan.components.android.dvsonline.DvsOnlineException
import net.idscan.components.android.dvsonline.DvsOnlineFragment
import net.idscan.components.android.dvsonline.net.ValidationResult

class DiveSDKActivity : AppCompatActivity() {

    companion object {
        const val EXTRA_MODE = "mode"
        const val EXTRA_TOKEN = "token"
        const val EXTRA_LICENSE_KEY = "licenseKey"
        const val EXTRA_CONFIGURATION = "configuration"
        const val EXTRA_INTEGRATION_ID = "integrationId"
        const val EXTRA_BASE_URL = "baseUrl"
        const val EXTRA_APPLICANT_ID = "applicantId"
        const val EXTRA_THEME = "theme"
        const val EXTRA_THEME_ACCENT = "accentColor"
        const val EXTRA_THEME_ON_PRIMARY = "onPrimaryColor"
        const val EXTRA_THEME_FONT_MOD = "fontSizeModifier"
        const val EXTRA_USER_AGENT = "userAgent"
        const val EXTRA_COMPANY_PREFIX = "companyPrefix"
        const val EXTRA_ANDROID_OPTIONS = "androidOptions"
        const val EXTRA_VERIFICATION_MODE = "verificationMode"
        const val EXTRA_VERIFICATION_CONFIG = "verificationConfig"

        const val MODE_OFFLINE = "offline"
        const val MODE_ONLINE = "online"

        const val RESULT_REQUEST_KEY = "requestKey"
        const val RESULT_FULL_RESULT = "fullResult"
        const val RESULT_ERROR_CODE = "errorCode"
        const val RESULT_ERROR_MESSAGE = "errorMessage"

        // Written by DiveSDKModule immediately before startActivityForResult.
        // Read in attachBaseContext (before intent is set on the Activity).
        // Cleared in onCreate.
        @Volatile var pendingThemeBundleForAttach: Bundle? = null
    }

    override fun attachBaseContext(newBase: Context) {
        val bundle = pendingThemeBundleForAttach
        // ContextThemeWrapper applies R.style.Theme_DiveSDK lazily (no .theme call here —
        // calling .theme in attachBaseContext triggers initializeTheme() which accesses
        // newBase.getTheme() before the Activity is fully attached, crashing on some devices).
        val themed = ContextThemeWrapper(newBase, R.style.Theme_DiveSDK)
        val final = DiveThemeApplier.applyFontScale(themed, bundle)
        super.attachBaseContext(final)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val themeBundle = intent.getBundleExtra(EXTRA_THEME)
        pendingThemeBundleForAttach = null
        // Apply accent overlay here — views are inflated later in launchSDK(), so the
        // overlay takes effect before any Material components read colorPrimary.
        DiveThemeApplier.applyAccentOverlay(theme, themeBundle)
        val primaryColor = DiveThemeApplier.resolvePrimaryColor(themeBundle)
        val onPrimaryColor = DiveThemeApplier.resolveOnPrimaryColor(themeBundle)
        setupResultListeners()
        window.decorView.viewTreeObserver.addOnGlobalLayoutListener {
            applyExactButtonColors(window.decorView, primaryColor, onPrimaryColor)
        }
        if (savedInstanceState == null) {
            launchSDK()
        }
    }

    private fun applyExactButtonColors(view: View, primary: Int, onPrimary: Int) {
        if (view is MaterialButton && view !is CompoundButton) {
            val isOutlined = view.strokeWidth > 0 ||
                             view.backgroundTintList?.defaultColor == Color.TRANSPARENT
            if (isOutlined) {
                if (view.currentTextColor != primary) {
                    view.strokeColor = ColorStateList.valueOf(primary)
                    view.setTextColor(primary)
                    view.iconTint = ColorStateList.valueOf(primary)
                }
            } else {
                val bgWrong = view.backgroundTintList?.defaultColor != primary
                val textWrong = view.currentTextColor != onPrimary
                if (bgWrong) view.backgroundTintList = ColorStateList.valueOf(primary)
                if (textWrong) {
                    view.setTextColor(onPrimary)
                    view.iconTint = ColorStateList.valueOf(onPrimary)
                }
            }
        }
        if (view is ViewGroup) {
            for (i in 0 until view.childCount) {
                applyExactButtonColors(view.getChildAt(i), primary, onPrimary)
            }
        }
    }

    private fun setupResultListeners() {
        DvsFragment.setFragmentResultListener(
            supportFragmentManager,
            this,
            DvsFragment.RequestCallback { request -> handleDvsRequestResult(request) },
            DvsFragment.ErrorCallback { error -> handleDvsError(error) }
        )

        DvsOnlineFragment.setFragmentResultListener(
            supportFragmentManager,
            this,
            { result -> handleDvsOnlineResult(result) },
            { error -> handleDvsOnlineError(error) }
        )
    }

    private fun launchSDK() {
        when (intent.getStringExtra(EXTRA_MODE)) {
            MODE_OFFLINE -> launchOfflineSDK()
            MODE_ONLINE -> launchOnlineSDK()
            else -> finishWithError("INVALID_MODE", "Unknown SDK mode")
        }
    }

    private fun launchOfflineSDK() {
        val token = intent.getStringExtra(EXTRA_TOKEN)
        val licenseKey = intent.getStringExtra(EXTRA_LICENSE_KEY)
        val configJson = intent.getStringExtra(EXTRA_CONFIGURATION)

        if (token == null || licenseKey == null) {
            finishWithError("CONFIGURATION_ERROR", "Missing token or license key")
            return
        }
        if (configJson == null) {
            finishWithError("CONFIGURATION_ERROR", "Missing capture configuration")
            return
        }

        val baseUrl = intent.getStringExtra(EXTRA_BASE_URL)
        val userAgent = intent.getStringExtra(EXTRA_USER_AGENT)

        val captureConfig = try {
            DiveCaptureConfigBuilder.build(licenseKey, configJson)
        } catch (e: Exception) {
            finishWithError("CONFIGURATION_ERROR", e.message ?: "Invalid capture configuration")
            return
        }

        try {
            val verificationConfig = VerificationConfig()

            val configBuilder = DvsConfig.Builder(
                token,
                captureConfig,
                verificationConfig,
                VerificationMode.Server
            )
            baseUrl?.let { configBuilder.withCustomUrl(it) }
            userAgent?.let { configBuilder.withCustomUserAgent(it) }
            val config = configBuilder.build()

            val dvsFragment = DvsFragment.newInstance(config)

            supportFragmentManager.beginTransaction()
                .setPrimaryNavigationFragment(dvsFragment)
                .replace(android.R.id.content, dvsFragment, "DVS_FRAGMENT")
                .commit()

        } catch (e: Exception) {
            finishWithError("SDK_ERROR", "Failed to launch DIVE SDK: ${e.message}")
        }
    }

    private fun launchOnlineSDK() {
        val token = intent.getStringExtra(EXTRA_TOKEN)
        val integrationId = intent.getStringExtra(EXTRA_INTEGRATION_ID)
        val baseUrl = intent.getStringExtra(EXTRA_BASE_URL)
        val applicantId = intent.getStringExtra(EXTRA_APPLICANT_ID)

        if (token == null || integrationId == null || baseUrl == null || applicantId == null) {
            finishWithError("CONFIGURATION_ERROR", "Missing required parameters")
            return
        }

        val companyPrefix = intent.getStringExtra(EXTRA_COMPANY_PREFIX) ?: "IDScan"
        showDvsOnlineFragment(token, integrationId, applicantId, baseUrl, companyPrefix)
    }

    private fun showDvsOnlineFragment(
        token: String,
        integrationId: String,
        applicantId: String,
        baseUrl: String,
        companyPrefix: String = "IDScan"
    ) {
        try {
            val config = DvsOnlineConfig.Builder(
                token, integrationId, applicantId, companyPrefix
            )
                .withCustomUrl(baseUrl)
                .build()

            val fragment = DvsOnlineFragment.newInstance(config)

            supportFragmentManager.beginTransaction()
                .setPrimaryNavigationFragment(fragment)
                .replace(android.R.id.content, fragment, "DVS_ONLINE_FRAGMENT")
                .commit()

        } catch (e: Exception) {
            finishWithError("SDK_ERROR", "Failed to launch DIVE Online SDK: ${e.message}")
        }
    }

    private fun handleDvsRequestResult(request: VerificationRequest) {
        val resultIntent = Intent().apply {
            putExtra(RESULT_REQUEST_KEY, request.requestId)
        }
        setResult(Activity.RESULT_OK, resultIntent)
        finish()
    }

    private fun handleDvsError(error: DvsException) {
        val message = error.message ?: "Unknown SDK error"
        if (isCancellationError(message)) {
            finishWithError("USER_CANCELLED", "User cancelled the operation")
        } else {
            finishWithError("SDK_ERROR", message)
        }
    }

    private fun isCancellationError(message: String): Boolean {
        val lower = message.lowercase()
        return lower.contains("cancel") || lower.contains("dismiss") || lower.contains("close")
    }

    private fun handleDvsOnlineResult(result: ValidationResult) {
        try {
            val fieldsMap = HashMap<String, String>()
            result.documentFields.forEach { (key, value) ->
                fieldsMap[key.name] = value
            }

            val validationStatusMap = HashMap<String, Any>().apply {
                put("code", result.validationStatus.code.name)
                put("documentIsValid", result.validationStatus.documentIsValid ?: false)
                put("isExpired", result.validationStatus.isExpired ?: false)
                put("faceIsValid", result.validationStatus.faceIsValid ?: false)
                put("antiSpoofingIsValid", result.validationStatus.antiSpoofingIsValid ?: false)
            }

            val fullResultMap = HashMap<String, Any>().apply {
                put("attemptId", result.attemptId)
                put("attemptsLeft", result.attemptsLeft)
                put("documentType", result.documentType.name)
                put("validationStatus", validationStatusMap)
                put("documentFields", fieldsMap)
            }

            val resultIntent = Intent().apply {
                putExtra(RESULT_REQUEST_KEY, result.attemptId.toString())
                putExtra(RESULT_FULL_RESULT, fullResultMap)
            }
            setResult(Activity.RESULT_OK, resultIntent)
            finish()

        } catch (e: Exception) {
            finishWithError("RESULT_PROCESSING_ERROR", "Error processing result: ${e.message}")
        }
    }

    private fun handleDvsOnlineError(error: DvsOnlineException) {
        val message = error.message ?: "Unknown DIVE Online SDK error"
        if (isCancellationError(message)) {
            finishWithError("USER_CANCELLED", "User cancelled the operation")
        } else {
            finishWithError("SDK_ERROR", message)
        }
    }

    private fun finishWithError(code: String, message: String) {
        val resultIntent = Intent().apply {
            putExtra(RESULT_ERROR_CODE, code)
            putExtra(RESULT_ERROR_MESSAGE, message)
        }
        setResult(Activity.RESULT_CANCELED, resultIntent)
        finish()
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        @Suppress("DEPRECATION")
        super.onBackPressed()
        finishWithError("USER_CANCELLED", "User cancelled the operation")
    }
}
