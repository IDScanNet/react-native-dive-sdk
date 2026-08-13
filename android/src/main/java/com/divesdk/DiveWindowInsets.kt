package com.divesdk

import android.view.View
import androidx.appcompat.app.AppCompatActivity
import androidx.core.graphics.Insets
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat

internal object DiveWindowInsets {

    /**
     * Workaround for Android 15+ (host targetSdk 35+) edge-to-edge enforcement.
     *
     * The native SDK's layouts place their action bars outside the views that declare
     * `fitsSystemWindows` — `ly_bottom_bar` in `dvs_capture_steps_fragment` and
     * `ly_confirmation` in `dvs_capture_manual_upload_fragment` are siblings of the
     * CoordinatorLayout that handles insets — so those buttons render under the navigation
     * bar and can be untappable. We inset the fragment container instead.
     *
     * Remove once upstream dvs-capture handles window insets itself; because we consume only
     * what we apply, an upstream fix makes this a no-op rather than double padding.
     */
    fun install(activity: AppCompatActivity) {
        if (!activity.resources.getBoolean(R.bool.dive_sdk_apply_system_bar_insets)) return
        val content: View = activity.findViewById(android.R.id.content) ?: return

        // Baseline captured once: always write baseline + computed, never accumulate.
        val baseLeft = content.paddingLeft
        val baseRight = content.paddingRight
        val baseBottom = content.paddingBottom
        var applied: Insets? = null

        ViewCompat.setOnApplyWindowInsetsListener(content) { v, insets ->
            val bars = insets.getInsets(
                WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout()
            )
            val ime = insets.getInsets(WindowInsetsCompat.Type.ime())
            val left = bars.left
            val right = bars.right
            val bottom = maxOf(bars.bottom, ime.bottom)

            // Write only on change — DiveSDKActivity keeps a decorView global-layout listener
            // that re-walks the tree on every layout pass, so an unconditional setPadding
            // would feed a padding -> layout -> retint -> layout loop.
            val current = applied
            if (current == null || current.left != left ||
                current.right != right || current.bottom != bottom
            ) {
                applied = Insets.of(left, 0, right, bottom)
                v.setPadding(baseLeft + left, v.paddingTop, baseRight + right, baseBottom + bottom)
            }

            // Consume ONLY what we applied, so the SDK roots that do declare fitsSystemWindows
            // (dvs_capture_flow_fragment, dvsonline_initializing/processing_layout) don't pad
            // the bottom a second time. Top is passed through untouched so the
            // CollapsingToolbarLayout / statusBarScrim behaviour stays as it is today.
            insets.inset(left, 0, right, bottom)
        }
        ViewCompat.requestApplyInsets(content)
    }
}
