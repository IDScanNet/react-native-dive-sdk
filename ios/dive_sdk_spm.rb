# ios/dive_sdk_spm.rb
#
# Embeds IDScanCapture.framework (a transitive dynamic XCFramework from
# DIVE-SDK-iOS) into the app bundle via a Run Script build phase.
#
# Also patches the CocoaPods-generated [CP] Copy XCFrameworks phase in the
# DiveSdk pod target, which is generated with wrong paths (ios/Frameworks/…)
# when CocoaPods resolves SPM binary targets.  The patch redirects the script
# to the correct SourcePackages/checkouts location at build time.
#
# Usage — add to your Podfile:
#
#   require_relative '../node_modules/react-native-dive-sdk/ios/dive_sdk_spm'
#
#   post_install do |installer|
#     add_dive_sdk_spm(installer)
#     react_native_post_install(installer, ...)
#   end

DIVE_SDK_SPM_URL   = "https://github.com/IDScanNet/DIVE-SDK-iOS.git"
DIVE_SDK_SPM_VERSION = "3.251121.1"
EMBED_SCRIPT_NAME  = "[DiveSDK] Embed IDScanCapture.framework"

# ---------------------------------------------------------------------------
# Private helpers
# ---------------------------------------------------------------------------

# Removes any leftover DIVE-SDK-iOS package references / product dependencies
# that an earlier version of this helper may have added to the app project.
def _remove_dive_spm_artifacts(app_project)
  changed = false

  # 1. Remove PBXBuildFile entries that reference DIVESDK/DIVEOnlineSDK products
  app_project.targets.each do |target|
    target.frameworks_build_phase.files.dup.each do |bf|
      product_ref = bf.respond_to?(:product_ref) ? bf.product_ref : nil
      next unless product_ref.is_a?(Xcodeproj::Project::Object::XCSwiftPackageProductDependency)
      next unless %w[DIVESDK DIVEOnlineSDK].include?(product_ref.product_name)
      target.frameworks_build_phase.remove_file_reference(bf)
      bf.remove_from_project
      changed = true
    end

    # 2. Remove package product dependencies for DIVESDK / DIVEOnlineSDK
    target.package_product_dependencies.dup.each do |dep|
      next unless dep.respond_to?(:product_name)
      next unless %w[DIVESDK DIVEOnlineSDK].include?(dep.product_name)
      target.package_product_dependencies.delete(dep)
      dep.remove_from_project
      changed = true
    end
  end

  # 3. Remove the XCRemoteSwiftPackageReference for DIVE-SDK-iOS
  app_project.root_object.package_references.dup.each do |ref|
    next unless ref.isa == "XCRemoteSwiftPackageReference"
    next unless ref.respond_to?(:repositoryURL) && ref.repositoryURL == DIVE_SDK_SPM_URL
    app_project.root_object.package_references.delete(ref)
    ref.remove_from_project
    changed = true
  end

  Pod::UI.puts "[DiveSDK] Removed leftover SPM artifacts from app project." if changed
end

# Patches the CocoaPods-generated "[CP] Copy XCFrameworks" build phase in the
# DiveSdk pod target.  CocoaPods generates this script with paths relative to
# the pod's source root (ios/Frameworks/…) that don't exist at build time when
# the xcframeworks come from an SPM dependency resolved into SourcePackages.
#
# The replacement script uses the same dynamic SourcePackages discovery as the
# app-target embed script, so it works on any machine / CI environment.
def _patch_dive_pod_xcframeworks(installer)
  pods_project = installer.pods_project
  return unless pods_project

  patched = false
  pods_project.targets.each do |target|
    next unless target.name == "DiveSdk"

    target.build_phases.each do |phase|
      next unless phase.is_a?(Xcodeproj::Project::Object::PBXShellScriptBuildPhase)
      next unless phase.name.to_s.include?("Copy XCFrameworks")

      phase.shell_path = "/bin/bash"
      phase.shell_script = <<~'SCRIPT'
        set -euo pipefail

        # CocoaPods resolves SPM packages into SourcePackages/checkouts/ relative
        # to the workspace DerivedData directory.  Check both standard locations.
        SOURCE_PKGS_CANDIDATES=(
          "${BUILD_DIR}/../../SourcePackages/checkouts"
          "${PODS_ROOT}/../build/DerivedData/SourcePackages/checkouts"
        )

        SOURCE_PKGS=""
        for CANDIDATE in "${SOURCE_PKGS_CANDIDATES[@]}"; do
          if [ -d "$CANDIDATE" ]; then
            SOURCE_PKGS="$(cd "$CANDIDATE" && pwd)"
            break
          fi
        done

        if [ -z "$SOURCE_PKGS" ]; then
          echo "warning: [DiveSDK] SourcePackages/checkouts not found — skipping XCFrameworks copy."
          exit 0
        fi

        XCFRAMEWORKS=(
          "DIVE-SDK-iOS/Libs/IDScanCapture.xcframework"
          "IDScanIDDetectorIOS/Libs/IDScanMRZDetector.xcframework"
          "IDScanIDDetectorIOS/Libs/IDScanPDFDetector.xcframework"
        )

        DEST="${PODS_XCFRAMEWORKS_BUILD_DIR}/DiveSdk"
        mkdir -p "$DEST"

        for XCFW_REL in "${XCFRAMEWORKS[@]}"; do
          XCFW_PATH="${SOURCE_PKGS}/${XCFW_REL}"
          if [ ! -d "$XCFW_PATH" ]; then
            echo "warning: [DiveSDK] ${XCFW_REL} not found at ${XCFW_PATH} — skipping."
            continue
          fi

          if [[ "${PLATFORM_NAME}" == *simulator* ]]; then
            SLICE="${XCFW_PATH}/ios-arm64_x86_64-simulator"
            [ -d "$SLICE" ] || SLICE="${XCFW_PATH}/ios-x86_64-simulator"
          else
            SLICE="${XCFW_PATH}/ios-arm64"
          fi

          FW_NAME="$(basename "$XCFW_PATH" .xcframework).framework"
          FW_PATH="${SLICE}/${FW_NAME}"
          if [ ! -d "$FW_PATH" ]; then
            echo "warning: [DiveSDK] Slice not found at ${FW_PATH} — skipping."
            continue
          fi

          rsync --delete -av --filter "P .*.??????" --links \
            --filter "- CVS/" --filter "- .svn/" --filter "- .git/" --filter "- .hg/" \
            "${FW_PATH}/" "${DEST}/${FW_NAME}/"
          echo "[DiveSDK] Copied ${FW_NAME} to ${DEST}"
        done
      SCRIPT

      patched = true
    end
  end

  if patched
    pods_project.save
    Pod::UI.puts "[DiveSDK] Patched [CP] Copy XCFrameworks in DiveSdk pod target."
  end
end

# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

# Adds a Run Script build phase to the app target that locates
# IDScanCapture.xcframework (resolved by CocoaPods' SPM integration into
# SourcePackages/checkouts) and copies + code-signs the correct slice into
# the app's Frameworks folder at build time.
#
# Also patches the Pods project so the CocoaPods-generated xcframeworks copy
# script uses the correct SourcePackages paths instead of ios/Frameworks/.
def add_dive_sdk_spm(installer)
  app_project = installer.aggregate_targets.first&.user_project
  if app_project.nil?
    Pod::UI.warn "[DiveSDK] Could not locate the app Xcode project — skipping."
    return
  end

  # Clean up anything a previous version of this helper may have left behind
  _remove_dive_spm_artifacts(app_project)

  app_project.targets.each do |target|
    next unless target.product_type == "com.apple.product-type.application"

    # Add or update the script (remove stale version if present)
    target.shell_script_build_phases.select { |p| p.name == EMBED_SCRIPT_NAME }.each do |old|
      target.build_phases.delete(old)
      old.remove_from_project
    end

    phase = target.new_shell_script_build_phase(EMBED_SCRIPT_NAME)
    phase.shell_path = "/bin/bash"
    phase.shell_script = <<~'SCRIPT'
      set -euo pipefail

      FRAMEWORKS_DIR="${TARGET_BUILD_DIR}/${FRAMEWORKS_FOLDER_PATH}"

      # All binary XCFrameworks that are transitive dependencies of DIVESDK /
      # DIVEOnlineSDK and must be embedded in the app bundle at runtime.
      # Format: "<checkout-subdir>/<relative-path-to-xcframework>"
      XCFRAMEWORKS=(
        "DIVE-SDK-iOS/Libs/IDScanCapture.xcframework"
        "IDScanIDDetectorIOS/Libs/IDScanMRZDetector.xcframework"
        "IDScanIDDetectorIOS/Libs/IDScanPDFDetector.xcframework"
      )

      # CocoaPods resolves SPM packages into SourcePackages/checkouts/ relative
      # to the workspace DerivedData directory. Check standard locations.
      SOURCE_PKGS_CANDIDATES=(
        "${BUILD_DIR}/../../SourcePackages/checkouts"
        "${PODS_ROOT}/../build/DerivedData/SourcePackages/checkouts"
      )

      SOURCE_PKGS=""
      for CANDIDATE in "${SOURCE_PKGS_CANDIDATES[@]}"; do
        if [ -d "$CANDIDATE" ]; then
          SOURCE_PKGS="$(cd "$CANDIDATE" && pwd)"
          break
        fi
      done

      if [ -z "$SOURCE_PKGS" ]; then
        echo "warning: [DiveSDK] SourcePackages/checkouts not found — skipping embed."
        exit 0
      fi

      mkdir -p "${FRAMEWORKS_DIR}"

      for XCFW_REL in "${XCFRAMEWORKS[@]}"; do
        XCFW_PATH="${SOURCE_PKGS}/${XCFW_REL}"
        FW_NAME="$(basename "${XCFW_PATH}" .xcframework).framework"

        if [ ! -d "$XCFW_PATH" ]; then
          echo "warning: [DiveSDK] ${XCFW_REL} not found at ${XCFW_PATH} — skipping."
          continue
        fi

        # Select platform slice
        if [[ "${PLATFORM_NAME}" == *simulator* ]]; then
          SLICE_DIR="${XCFW_PATH}/ios-arm64_x86_64-simulator"
          [ -d "$SLICE_DIR" ] || SLICE_DIR="${XCFW_PATH}/ios-x86_64-simulator"
        else
          SLICE_DIR="${XCFW_PATH}/ios-arm64"
        fi

        FW_PATH="${SLICE_DIR}/${FW_NAME}"
        if [ ! -d "$FW_PATH" ]; then
          echo "warning: [DiveSDK] Slice not found at ${FW_PATH} — skipping."
          continue
        fi

        # Sync without preserving read-only permissions from the xcframework
        rsync -rl --delete "${FW_PATH}/" "${FRAMEWORKS_DIR}/${FW_NAME}/"
        chmod -R u+w "${FRAMEWORKS_DIR}/${FW_NAME}"

        if [ "${CODE_SIGNING_REQUIRED:-NO}" == "YES" ] && [ -n "${EXPANDED_CODE_SIGN_IDENTITY:-}" ]; then
          codesign --force --sign "${EXPANDED_CODE_SIGN_IDENTITY}" \
            --preserve-metadata=identifier,entitlements \
            "${FRAMEWORKS_DIR}/${FW_NAME}"
        fi

        echo "[DiveSDK] Embedded ${FW_NAME}"
      done
    SCRIPT

    # Ensure @rpath includes the app's Frameworks folder
    target.build_configurations.each do |config|
      rpaths = config.build_settings["LD_RUNPATH_SEARCH_PATHS"] || "$(inherited)"
      unless rpaths.to_s.include?("@executable_path/Frameworks")
        config.build_settings["LD_RUNPATH_SEARCH_PATHS"] = "$(inherited) @executable_path/Frameworks"
      end
    end

    Pod::UI.puts "[DiveSDK] Added embed Run Script to target '#{target.name}'."
  end

  app_project.save

  # Fix the CocoaPods-generated xcframeworks copy script in the DiveSdk pod
  # target, which uses wrong ios/Frameworks/ paths when SPM resolves binary
  # xcframework targets.
  _patch_dive_pod_xcframeworks(installer)
end
