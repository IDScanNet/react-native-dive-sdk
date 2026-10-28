require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "DiveSdk"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["homepage"]
  s.license      = package["license"]
  s.authors      = package["author"]

  s.platforms    = { :ios => min_ios_version_supported }
  s.source       = { :git => "https://github.com/AcuantFIS/react-native-dive-sdk.git", :tag => "#{s.version}" }

  s.source_files = "ios/**/*.{h,m,swift}"

  s.dependency "React-Core"

  # Adds DIVE-SDK-iOS to the DiveSdk pod target in Pods.xcodeproj so the Swift
  # sources can import DIVESDK, DIVEOnlineSDK, and their transitive dependencies.
  # The user's app target gets DIVE-SDK-iOS linked via add_dive_sdk_spm(installer)
  # in their Podfile post_install hook (see ios/dive_sdk_spm.rb).
  spm_dependency(
    s,
    url: "https://github.com/IDScanNet/DIVE-SDK-iOS.git",
    requirement: { kind: "upToNextMajorVersion", minimumVersion: "3.261014.1" },
    products: ["DIVESDK", "DIVEOnlineSDK"]
  )
end
