import Capacitor
import UIKit

@MainActor
final class SceneDelegate: UIResponder, UISceneDelegate, UIWindowSceneDelegate {

    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else {
            return
        }

        let window = UIWindow(windowScene: windowScene)
        window.rootViewController = MTWCapacitorVC()
        window.makeKeyAndVisible()
        self.window = window

        // A cold start carries its launch url on the connection options rather than through
        // `application(_:open:)`, so it has to be picked up here or the deeplink is lost
        if let userActivity = connectionOptions.userActivities.first,
           userActivity.activityType == NSUserActivityTypeBrowsingWeb,
           let url = userActivity.webpageURL {
            handleUrl(url)
        } else if let urlContext = connectionOptions.urlContexts.first {
            handleUrl(urlContext.url)
        }
    }

    func scene(_ scene: UIScene, openURLContexts urlContexts: Set<UIOpenURLContext>) {
        if let url = urlContexts.first?.url {
            handleUrl(url)
        }
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        if userActivity.activityType == NSUserActivityTypeBrowsingWeb, let url = userActivity.webpageURL {
            handleUrl(url)
        }
    }

    private func handleUrl(_ url: URL) {
        _ = ApplicationDelegateProxy.shared.application(UIApplication.shared, open: url)
    }
}
