# Trusted Web Activity Setup

GigLink ships as a Progressive Web App (PWA) and is distributed in the Play Store through a Trusted Web Activity (TWA). To remove the browser address bar when the Android app launches, the TWA must be verified using a **Digital Asset Links** declaration that proves the website and the Android application are owned by the same party.

The backend now serves files from `backend/.well-known/`, so hosting the Digital Asset Links payload at `https://<your-domain>/.well-known/assetlinks.json` is just a matter of keeping that JSON up to date.

## 1. Collect the required values

1. **Package name** – the application ID used in the Play Console (e.g. `com.example.app`).
2. **SHA‑256 certificate fingerprints** – the fingerprints of the certificate that *signs the production Play build*.  
   - If Google Play App Signing is enabled (recommended), use the **App signing certificate** fingerprint shown in the Play Console.
   - Otherwise, generate it locally with:
     ```bash
     keytool -list -v -keystore path/to/your-release-key.jks
     ```
   - TWAs can list multiple fingerprints, so you may add both the Google-provided fingerprint and your local upload certificate if needed.

## 2. Update the asset links declaration

Edit `backend/.well-known/assetlinks.json` and replace the placeholders with the values from step 1:

```json
[
  {
    "relation": [
      "delegate_permission/common.handle_all_urls"
    ],
    "target": {
      "namespace": "android_app",
      "package_name": "com.example.app",
      "sha256_cert_fingerprints": [
        "AA:BB:CC:...:ZZ"
      ]
    }
  }
]
```

Commit and redeploy the backend so that the updated JSON is served at `https://<your-domain>/.well-known/assetlinks.json`.

## 3. Verify the association

After deployment:

1. Visit `https://<your-domain>/.well-known/assetlinks.json` in a browser to ensure it returns the JSON without redirects or HTML wrapping.
2. Use the [Digital Asset Links API](https://developers.google.com/digital-asset-links/tools/generator) (requires network access) or the `assetlinks` command-line tool to confirm the association.
3. Clear Chrome's cache or increment the TWA version, then reinstall the Play Store build. Once verified, Chrome will launch your app without the browser address bar.

If the address bar still appears, double-check that the fingerprints match the **App signing certificate**, not the upload certificate, and that the package name is exact.
