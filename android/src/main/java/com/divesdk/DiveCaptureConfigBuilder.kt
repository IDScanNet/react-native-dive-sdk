package com.divesdk

import net.idscan.components.android.dvs.capture.CaptureConfig
import net.idscan.components.android.dvs.common.DocumentType
import org.json.JSONObject

object DiveCaptureConfigBuilder {

    fun build(licenseKey: String, configJson: String): CaptureConfig {
        val root = JSONObject(configJson)

        // "realFaceMode" is ignored: RealFace configuration was removed in DIVE SDK 2.0.
        val showSubmitBtn = if (root.has("showSubmitBtn")) {
            root.optBoolean("showSubmitBtn", true)
        } else {
            !root.optBoolean("autoSubmit", false)
        }

        val builder = CaptureConfig.builder(licenseKey)
            .withPreviewAnimations(root.optBoolean("playPreviewAnimations", true))
            .withShowDocumentTypeSelector(root.optBoolean("isShowDocumentTypeSelect", false))
            .withAutoStart(root.optBoolean("autoStart", false))
            .withAutoContinue(root.optBoolean("autoContinue", false))
            .showSubmitBtn(showSubmitBtn)
            .allowSubmitWithWarnings(root.optBoolean("allowSubmitWithWarnings", false))
        if (root.has("autocaptureConfidence")) {
            builder.withAutocaptureConfidence(root.optDouble("autocaptureConfidence").toFloat())
        }

        val docs = root.optJSONArray("documentTypes")
            ?: throw IllegalArgumentException("documentTypes is required")

        var addedAny = false
        for (i in 0 until docs.length()) {
            val doc = docs.getJSONObject(i)
            if (!doc.optBoolean("isActive", false)) continue

            val typeName = doc.optString("type")
            val docType = mapDocumentType(typeName)

            val steps = doc.optJSONArray("steps") ?: continue
            var hasFront = false; var frontVideo = false; var frontUploader = false
            var hasBack = false;  var backVideo = false;  var backUploader = false
            var hasFace = false;  var faceVideo = false;  var faceUploader = false

            for (j in 0 until steps.length()) {
                val step = steps.getJSONObject(j)
                val stepType = step.optString("type")
                val mode = step.optJSONObject("mode")
                val video = mode?.optBoolean("video", false) ?: false
                val uploader = mode?.optBoolean("uploader", false) ?: false
                when (stepType) {
                    "front" -> { hasFront = true; frontVideo = video; frontUploader = uploader }
                    // "pdf" and "mrz" are iOS step names for the back side; on Android the neural
                    // net auto-detects PDF417/MRZ/plain when withBack is configured.
                    "back", "pdf", "mrz" -> { hasBack = true; backVideo = video; backUploader = uploader }
                    "face"  -> { hasFace = true;  faceVideo = video;  faceUploader = uploader }
                }
            }

            if (!hasFront && !hasBack && !hasFace) continue

            // Native signature is (isUploadEnabled, isCameraEnabled).
            val flow = builder.withDocumentType(docType)
            if (hasFront) flow.withFront(frontUploader, frontVideo)
            if (hasBack) flow.withBack(backUploader, backVideo)
            if (hasFace) flow.withFace(faceUploader, faceVideo)
            flow.complete()
            addedAny = true
        }

        if (!addedAny) {
            throw IllegalArgumentException("No active document types in configuration")
        }

        return builder.build()
    }

    private fun mapDocumentType(name: String): DocumentType = when (name) {
        "DL" -> DocumentType.DriverLicense
        "ID" -> DocumentType.IdentificationCard
        "Passport" -> DocumentType.Passport
        "PassportCard" -> DocumentType.PassportCard
        "GreenCard" -> DocumentType.GreenCard
        "EmploymentAuthorization" -> DocumentType.EmploymentAuthorization
        "InternationalId" -> DocumentType.InternationalId
        else -> throw IllegalArgumentException("Unknown document type: $name")
    }
}
