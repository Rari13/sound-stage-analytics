import UIKit
import Capacitor
import WebKit

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        
        // ============================================
        // CONFIGURATION CRITIQUE POUR LE SCANNER QR NATIF
        // ============================================
        // Le plugin @capacitor-community/barcode-scanner affiche la caméra
        // DERRIÈRE la WebView. Pour voir la caméra, la WebView doit être transparente.
        //
        // Cette configuration écoute la création de la WebView par Capacitor
        // et force la transparence dès qu'elle est créée.
        // ============================================
        
        NotificationCenter.default.addObserver(
            forName: NSNotification.Name(rawValue: "CapacitorWebViewCreated"),
            object: nil,
            queue: .main
        ) { (notification) in
            if let webView = notification.object as? WKWebView {
                // Désactiver le fond opaque blanc par défaut d'iOS
                webView.isOpaque = false
                
                // Rendre le fond de la WebView transparent
                webView.backgroundColor = UIColor.clear
                
                // Rendre le fond du contenu scrollable transparent
                webView.scrollView.backgroundColor = UIColor.clear
                
                // Debug: confirmer que la configuration est appliquée
                print("[Spark Events] WebView transparency configured for barcode scanner")
            }
        }
        
        return true
    }

    // Gestion des Deep Links (liens vers l'application)
    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    // Gestion des Universal Links
    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }
}
