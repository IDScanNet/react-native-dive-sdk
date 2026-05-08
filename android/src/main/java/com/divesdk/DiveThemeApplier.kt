package com.divesdk

import android.content.Context
import android.content.res.Configuration
import android.content.res.Resources
import android.graphics.Color
import android.os.Bundle

object DiveThemeApplier {

    private data class Preset(val hex: String, val styleRes: Int)

    private val PRESETS = listOf(
        Preset("#0067F5", R.style.ThemeOverlay_DiveSDK_Accent_Blue),
        Preset("#F44336", R.style.ThemeOverlay_DiveSDK_Accent_Red),
        Preset("#E91E63", R.style.ThemeOverlay_DiveSDK_Accent_Pink),
        Preset("#9C27B0", R.style.ThemeOverlay_DiveSDK_Accent_Purple),
        Preset("#673AB7", R.style.ThemeOverlay_DiveSDK_Accent_DeepPurple),
        Preset("#3F51B5", R.style.ThemeOverlay_DiveSDK_Accent_Indigo),
        Preset("#00BCD4", R.style.ThemeOverlay_DiveSDK_Accent_Cyan),
        Preset("#009688", R.style.ThemeOverlay_DiveSDK_Accent_Teal),
        Preset("#4CAF50", R.style.ThemeOverlay_DiveSDK_Accent_Green),
        Preset("#FF9800", R.style.ThemeOverlay_DiveSDK_Accent_Orange),
        Preset("#FF5722", R.style.ThemeOverlay_DiveSDK_Accent_DeepOrange),
        Preset("#795548", R.style.ThemeOverlay_DiveSDK_Accent_Brown),
    )

    fun applyFontScale(context: Context, bundle: Bundle?): Context {
        if (bundle == null) return context
        val fontMod = bundle.getFloat(DiveSDKActivity.EXTRA_THEME_FONT_MOD, Float.NaN)
        if (fontMod.isNaN() || fontMod == 0f) return context
        val config = Configuration(context.resources.configuration)
        config.fontScale = (1f + fontMod / 10f).coerceAtLeast(0.5f)
        return context.createConfigurationContext(config)
    }

    fun resolvePrimaryColor(bundle: Bundle?): Int {
        val accentHex = bundle?.getString(DiveSDKActivity.EXTRA_THEME_ACCENT)
        if (accentHex != null) {
            val parsed = runCatching { Color.parseColor(accentHex) }.getOrNull()
            if (parsed != null) return parsed
        }
        return Color.parseColor("#1A73E8")
    }

    fun resolveOnPrimaryColor(bundle: Bundle?): Int {
        bundle?.getString(DiveSDKActivity.EXTRA_THEME_ON_PRIMARY)?.let { hex ->
            runCatching { Color.parseColor(hex) }.getOrNull()?.let { return it }
        }
        val accentHex = bundle?.getString(DiveSDKActivity.EXTRA_THEME_ACCENT)
        if (accentHex != null) {
            val parsed = runCatching { Color.parseColor(accentHex) }.getOrNull()
            if (parsed != null) {
                return if (wcagLuminance(parsed) > 0.179) Color.BLACK else Color.WHITE
            }
        }
        return Color.WHITE
    }

    // WCAG 2.1 relative luminance — sRGB channels are gamma-linearized before weighting.
    private fun wcagLuminance(color: Int): Double {
        fun linearize(c: Int): Double {
            val s = c / 255.0
            return if (s <= 0.04045) s / 12.92 else Math.pow((s + 0.055) / 1.055, 2.4)
        }
        return 0.2126 * linearize(Color.red(color)) +
               0.7152 * linearize(Color.green(color)) +
               0.0722 * linearize(Color.blue(color))
    }

    fun applyAccentOverlay(theme: Resources.Theme, bundle: Bundle?) {
        if (bundle == null) return
        val accentHex = bundle.getString(DiveSDKActivity.EXTRA_THEME_ACCENT) ?: return
        val overlayRes = findNearestPreset(accentHex) ?: return
        theme.applyStyle(overlayRes, true)
    }

    private fun findNearestPreset(hex: String): Int? {
        val target = runCatching { Color.parseColor(hex) }.getOrNull() ?: return null
        return PRESETS.minByOrNull { colorDistance(target, Color.parseColor(it.hex)) }?.styleRes
    }

    private fun colorDistance(a: Int, b: Int): Double {
        val dr = (Color.red(a) - Color.red(b)).toDouble()
        val dg = (Color.green(a) - Color.green(b)).toDouble()
        val db = (Color.blue(a) - Color.blue(b)).toDouble()
        return dr * dr + dg * dg + db * db
    }
}
