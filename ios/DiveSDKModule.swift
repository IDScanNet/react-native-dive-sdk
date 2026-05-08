import Foundation
import React
import AVFoundation
import DIVESDK
import DIVEOnlineSDK
import DIVESDKCommon

@objc(DiveSDKModule)
class DiveSDKModule: RCTEventEmitter {

  private var diveSDK: DIVESDK?
  private var diveOnlineSDK: DIVEOnlineSDK?
  private var resolve: RCTPromiseResolveBlock?
  private var reject: RCTPromiseRejectBlock?
  private weak var currentWrapper: DiveWrapperViewController?

  override static func moduleName() -> String! {
    return "DiveSDKModule"
  }

  @objc override static func requiresMainQueueSetup() -> Bool {
    return false
  }

  override func supportedEvents() -> [String]! {
    return ["DiveSDKUploadProgress"]
  }

  // MARK: - Camera Permission

  private func ensureCameraPermission(_ completion: @escaping (Bool) -> Void) {
    switch AVCaptureDevice.authorizationStatus(for: .video) {
    case .authorized:
      completion(true)
    case .notDetermined:
      AVCaptureDevice.requestAccess(for: .video) { granted in
        completion(granted)
      }
    default:
      completion(false)
    }
  }

  // MARK: - Launch DIVE SDK (Offline)

  @objc func launchDive(
    _ token: String,
    licenseKey: String,
    configuration: NSDictionary,
    baseUrl: String?,
    userAgent: String?,   // accepted for API symmetry; iOS SDK does not expose UA override
    theme: NSDictionary?,
    iosOptions: NSDictionary?,
    androidOptions: NSDictionary?,  // accepted for API symmetry; ignored on iOS
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    self.resolve = resolve
    self.reject = reject

    var config = configuration as? [String: Any] ?? [:]
    config["licenseKey"] = licenseKey
    let diveTheme = DiveThemeBuilder.build(from: theme)
    let resolvedBaseUrl: String? = (baseUrl?.isEmpty == false) ? baseUrl : nil

    ensureCameraPermission { [weak self] granted in
      guard let self = self else { return }
      guard granted else {
        self.reject?("PERMISSION_DENIED", "Camera permission is required to scan documents", nil)
        self.resolve = nil
        self.reject = nil
        return
      }

      DispatchQueue.main.async { [weak self] in
        guard let self = self else { return }

        guard let rootVC = RCTPresentedViewController() else {
          self.reject?("SDK_ERROR", "No root view controller found", nil)
          self.resolve = nil
          self.reject = nil
          return
        }

        self.diveSDK = DIVESDK(configuration: config, token: token, baseURL: resolvedBaseUrl, delegate: self, theme: diveTheme)

        if let captureSettings = iosOptions?["captureSettings"] as? [String: Any] {
          if let vibroFeedback = captureSettings["vibroFeedback"] as? Bool {
            self.diveSDK?.vibroFeedback = vibroFeedback
          }
          if let blurThreshold = captureSettings["blurThreshold"] as? Double {
            self.diveSDK?.blurThreshold = CGFloat(blurThreshold)
          }
          if let logs = captureSettings["logs"] as? Bool {
            self.diveSDK?.logs = logs
          }
        }

        let wrapper = DiveWrapperViewController()
        self.currentWrapper = wrapper
        wrapper.onSDKDismissed = { [weak self, weak wrapper] in
          guard let self = self else { return }
          self.reject?("USER_CANCELLED", "User cancelled the operation", nil)
          self.cleanup()
          wrapper?.dismiss(animated: false)
        }

        rootVC.present(wrapper, animated: false) { [weak self, weak wrapper] in
          guard let self = self, let wrapper = wrapper else { return }
          self.diveSDK?.start(from: wrapper)
        }
      }
    }
  }

  // MARK: - Launch DIVE Online SDK

  @objc func launchDiveOnline(
    _ token: String,
    integrationId: String,
    baseUrl: String,
    applicantId: String,
    theme: NSDictionary?,
    iosOptions: NSDictionary?,      // reserved for future iOS-only online options
    androidOptions: NSDictionary?,  // accepted for API symmetry; ignored on iOS
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    self.resolve = resolve
    self.reject = reject
    let diveTheme = DiveThemeBuilder.build(from: theme)

    ensureCameraPermission { [weak self] granted in
      guard let self = self else { return }
      guard granted else {
        self.reject?("PERMISSION_DENIED", "Camera permission is required to scan documents", nil)
        self.resolve = nil
        self.reject = nil
        return
      }

      self.diveOnlineSDK = DIVEOnlineSDK(
        applicantID: applicantId,
        integrationID: integrationId,
        token: token,
        baseURL: baseUrl + "/public",
        delegate: self,
        theme: diveTheme
      )
      self.diveOnlineSDK?.updateLocation()
      self.diveOnlineSDK?.loadConfiguration { [weak self] error in
        guard let self = self else { return }
        if let error = error {
          self.reject?("CONFIGURATION_ERROR",
                      "Failed to load configuration: \(error.localizedDescription)",
                      error)
          self.resolve = nil
          self.reject = nil
          self.diveOnlineSDK = nil
          return
        }
        DispatchQueue.main.async {
          guard let rootVC = RCTPresentedViewController() else {
            self.reject?("SDK_ERROR", "No root view controller found", nil)
            self.resolve = nil
            self.reject = nil
            return
          }

          let wrapper = DiveWrapperViewController()
          self.currentWrapper = wrapper
          wrapper.onSDKDismissed = { [weak self, weak wrapper] in
            guard let self = self else { return }
            self.reject?("USER_CANCELLED", "User cancelled the operation", nil)
            self.cleanup()
            wrapper?.dismiss(animated: false)
          }

          rootVC.present(wrapper, animated: false) { [weak self, weak wrapper] in
            guard let self = self, let wrapper = wrapper else { return }
            self.diveOnlineSDK?.start(from: wrapper)
          }
        }
      }
    }
  }

  // MARK: - Cleanup

  private func cleanup() {
    resolve = nil
    reject = nil
    diveSDK = nil
    diveOnlineSDK = nil
    currentWrapper = nil
  }
}

// MARK: - DIVESDKDelegate

extension DiveSDKModule: DIVESDKDelegate {
  func diveSDKDataPrepaired(sdk: IDIVESDK, data: DIVESDKData) {
    currentWrapper?.sdkResultReceived = true
    sdk.close()
    currentWrapper?.showLoadingIndicator()
    sdk.sendData(data: data)
  }

  func diveSDKResult(sdk: IDIVESDK, result: [String: Any]) {
    let requestId = result["validationRequestId"] as? String ?? ""
    let resolveBlock = resolve
    currentWrapper?.sdkResultReceived = true
    currentWrapper?.hideLoadingIndicator()
    currentWrapper?.dismiss(animated: true) { [weak self] in
      resolveBlock?([
        "success": true,
        "requestKey": requestId,
        "fullResult": result
      ])
      self?.cleanup()
    }
  }

  func diveSDKError(sdk: IDIVESDK, error: Error) {
    let rejectBlock = reject
    currentWrapper?.sdkResultReceived = true
    currentWrapper?.hideLoadingIndicator()
    currentWrapper?.dismiss(animated: true) { [weak self] in
      rejectBlock?("SDK_ERROR", error.localizedDescription, error)
      self?.cleanup()
    }
  }

  func diveSDKSendingDataProgress(sdk: IDIVESDK, progress: Float, requestTime: TimeInterval) {
    DispatchQueue.main.async { [weak self] in
      self?.sendEvent(withName: "DiveSDKUploadProgress", body: Double(progress))
    }
  }
}

// MARK: - Wrapper ViewController for cancel detection

private class DiveWrapperViewController: UIViewController {
  var onSDKDismissed: (() -> Void)?
  var sdkResultReceived = false
  private var hasAppeared = false
  private var activityIndicator: UIActivityIndicatorView?
  private var verifyingLabel: UILabel?

  override init(nibName: String?, bundle: Bundle?) {
    super.init(nibName: nibName, bundle: bundle)
    modalPresentationStyle = .overFullScreen
  }

  required init?(coder: NSCoder) {
    super.init(coder: coder)
    modalPresentationStyle = .overFullScreen
  }

  override func present(_ viewControllerToPresent: UIViewController,
                        animated flag: Bool,
                        completion: (() -> Void)? = nil) {
    viewControllerToPresent.modalPresentationStyle = .fullScreen
    super.present(viewControllerToPresent, animated: flag, completion: completion)
  }

  override func viewDidLoad() {
    super.viewDidLoad()
    view.backgroundColor = UIColor(white: 0.0, alpha: 0.7)

    let indicator = UIActivityIndicatorView(style: .large)
    indicator.translatesAutoresizingMaskIntoConstraints = false
    indicator.color = .white
    indicator.hidesWhenStopped = true
    view.addSubview(indicator)

    let label = UILabel()
    label.translatesAutoresizingMaskIntoConstraints = false
    label.text = "Verifying ID"
    label.textColor = .white
    label.font = UIFont.systemFont(ofSize: 16, weight: .medium)
    label.isHidden = true
    view.addSubview(label)

    NSLayoutConstraint.activate([
      indicator.centerXAnchor.constraint(equalTo: view.centerXAnchor),
      indicator.centerYAnchor.constraint(equalTo: view.centerYAnchor),
      label.centerXAnchor.constraint(equalTo: view.centerXAnchor),
      label.topAnchor.constraint(equalTo: indicator.bottomAnchor, constant: 12)
    ])

    activityIndicator = indicator
    verifyingLabel = label
  }

  override func viewWillAppear(_ animated: Bool) {
    super.viewWillAppear(animated)
    guard hasAppeared else {
      hasAppeared = true
      return
    }
    if !sdkResultReceived {
      onSDKDismissed?()
    }
  }
  
  func showLoadingIndicator() {
    DispatchQueue.main.async { [weak self] in
      self?.activityIndicator?.startAnimating()
      self?.verifyingLabel?.isHidden = false
    }
  }

  func hideLoadingIndicator() {
    DispatchQueue.main.async { [weak self] in
      self?.activityIndicator?.stopAnimating()
      self?.verifyingLabel?.isHidden = true
    }
  }
}
