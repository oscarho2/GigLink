# iOS native push bridge

Use this when the PWA is wrapped in a native container (WKWebView/Capacitor) for the App Store. Web Push does not work there, so APNs is used instead.

## Backend configuration
- Add APNs credentials to the backend `.env`:
  - `APNS_KEY` (raw `.p8` contents) **or** `APNS_KEY_B64` **or** `APNS_KEY_PATH`
  - `APNS_KEY_ID` (kid from Apple)
  - `APNS_TEAM_ID`
  - `APNS_BUNDLE_ID` (or `APNS_TOPIC`; the bundle id is used as the topic)
  - `APNS_ENV` (`sandbox` or `production`; default production)
- The notification pipeline now reuses existing templates for APNs. When a user enables push notifications and has an APNs device registered, both web push and APNs are attempted.

## Device registration APIs
- `POST /api/notifications/apns/register` (auth required)
  - Body: `deviceToken` (string), optional `environment` (`sandbox`|`production`), `bundleId`, `appVersion`, `deviceModel`, `osVersion`
  - Stores or updates the token under the current user.
- `POST /api/notifications/apns/unregister` (auth required)
  - Body: `deviceToken`
- These endpoints mirror the existing web push subscribe/unsubscribe flows and respect the same notification preference flags.

## iOS wrapper implementation sketch (Swift)
```swift
// AppDelegate.swift
func application(_ application: UIApplication,
                 didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
    let token = deviceToken.map { String(format: "%02.2hhx", $0) }.joined()
    registerDeviceToken(token)
}

private func registerDeviceToken(_ token: String) {
    guard let url = URL(string: "https://<your-api>/api/notifications/apns/register") else { return }
    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.setValue(userAuthToken, forHTTPHeaderField: "x-auth-token")
    let body: [String: Any] = [
        "deviceToken": token,
        "environment": isDebugBuild ? "sandbox" : "production",
        "bundleId": Bundle.main.bundleIdentifier ?? ""
    ]
    request.httpBody = try? JSONSerialization.data(withJSONObject: body)
    URLSession.shared.dataTask(with: request).resume()
}
```

To relay a notification tap into the web app, dispatch a JS event in the WKWebView:
```swift
func userNotificationCenter(_ center: UNUserNotificationCenter,
                            didReceive response: UNNotificationResponse,
                            withCompletionHandler completionHandler: @escaping () -> Void) {
    let payload = response.notification.request.content.userInfo
    let json = try? String(data: JSONSerialization.data(withJSONObject: payload), encoding: .utf8)
    let script = "window.dispatchEvent(new CustomEvent('giglink:push-open', { detail: \(json ?? "{}") }));"
    webView.evaluateJavaScript(script, completionHandler: nil)
    completionHandler()
}
```

Listen for `giglink:push-open` in the web app (e.g., to navigate to a deep link). The payload matches the `data` object sent by the notification templates.
