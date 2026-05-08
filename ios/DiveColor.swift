import UIKit

enum DiveColor {
  static func parse(_ hex: String?) -> UIColor? {
    guard let hex = hex else { return nil }
    var s = hex.trimmingCharacters(in: .whitespacesAndNewlines)
    if s.hasPrefix("#") { s.removeFirst() }
    guard [6, 8].contains(s.count), let v = UInt64(s, radix: 16) else { return nil }
    let hasAlpha = s.count == 8
    let r = CGFloat((v >> (hasAlpha ? 24 : 16)) & 0xFF) / 255
    let g = CGFloat((v >> (hasAlpha ? 16 :  8)) & 0xFF) / 255
    let b = CGFloat((v >> (hasAlpha ?  8 :  0)) & 0xFF) / 255
    let a = hasAlpha ? CGFloat(v & 0xFF) / 255 : 1
    return UIColor(red: r, green: g, blue: b, alpha: a)
  }
}
