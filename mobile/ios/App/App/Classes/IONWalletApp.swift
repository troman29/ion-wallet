import UIKit
#if canImport(Capacitor)
import Capacitor
#endif

final class IONWalletApp: UIApplication {
    private var lastTouchEventTimestamp = TimeInterval(0)

    override func sendEvent(_ event: UIEvent) {
        super.sendEvent(event)

        guard let touches = event.allTouches,
              !touches.isEmpty else {
            return
        }

        let now = Date().timeIntervalSince1970
        guard now >= lastTouchEventTimestamp + 5 else {
            return
        }
        #if canImport(Capacitor)
        guard let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
              let window = windowScene.windows.first(where: { $0.isKeyWindow }),
              let vc = window.rootViewController as? CAPBridgeViewController else {
            return
        }
        lastTouchEventTimestamp = now
        vc.bridge?.triggerWindowJSEvent(eventName: "touch")
        #endif
    }
}
