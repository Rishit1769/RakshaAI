# RakshaAI Android

Native Flutter client for `raksha.rishit.codes`.

## Development

```powershell
flutter pub get
flutter run --dart-define=API_BASE_URL=https://raksha.rishit.codes/api --dart-define=WS_URL=https://raksha.rishit.codes
```

The APK communicates only with the RakshaAI backend. PostgreSQL, Gemini, SMTP,
JWT, and MinIO credentials remain on the server.

## Release signing

The permanent keystore must be stored outside Git and backed up securely.
Create `android/key.properties` locally:

```properties
storePassword=<secret>
keyPassword=<secret>
keyAlias=raksha
storeFile=C:/Users/<user>/.raksha/keys/raksha-release.jks
```

Build the universal APK:

```powershell
flutter build apk --release `
  --dart-define=API_BASE_URL=https://raksha.rishit.codes/api `
  --dart-define=WS_URL=https://raksha.rishit.codes
```

The resulting `build/app/outputs/flutter-apk/app-release.apk` is uploaded to
the MinIO object configured by `MINIO_APK_OBJECT_KEY` (`app/release.apk`).
Losing the keystore prevents compatible in-place updates, so keep an encrypted
offline backup of the keystore and its passwords.

The current dependency set supports Android 7.0 (API 24) and newer.
