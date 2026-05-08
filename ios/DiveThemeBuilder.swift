import UIKit
import DIVESDKCommon

enum DiveThemeBuilder {
  static func build(from dict: NSDictionary?) -> DIVESDKTheme? {
    guard let dict = dict, dict.count > 0 else { return nil }

    let accent = DiveColor.parse(dict["accentColor"] as? String)
    let fontMod = (dict["fontSizeModifier"] as? NSNumber)?.doubleValue

    guard accent != nil || fontMod != nil else { return nil }

    let defaultAccent = UIColor(red: 0, green: 103.0 / 255, blue: 245.0 / 255, alpha: 1)
    return DIVESDKTheme(
      accentColor: accent ?? defaultAccent,
      fontSizeModifier: CGFloat(fontMod ?? 0)
    )
  }
}
