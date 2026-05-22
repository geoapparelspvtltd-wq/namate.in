# Flutter + Cashfree Integration Guide

This document explains how to communicate between the **Namate Web App** and a **Flutter App** for Cashfree payments.

## 1. Flutter Setup (Android & iOS)

### Dependencies
Add these to your `pubspec.yaml`:
```yaml
dependencies:
  webview_flutter: ^4.4.2
  cashfree_pg: ^2.0.0
  flutter_local_notifications: ^16.3.0 # For system notifications
```

### iOS Specific Configuration
For iOS, you must add the following to your `ios/Runner/Info.plist`:

```xml
<key>LSApplicationQueriesSchemes</key>
<array>
	<string>phonepe</string>
	<string>tez</string>
	<string>paytm</string>
</array>
<key>NSLocationWhenInUseUsageDescription</key>
<string>We need your location to autofill shipping details.</string>
<key>UIBackgroundModes</key>
<array>
	<string>remote-notification</string>
</array>
```

### Flutter Code for Notifications (Dart)

Add this to your `addJavaScriptChannel` map in Flutter:

```dart
..addJavaScriptChannel(
  'FlutterNotificationChannel',
  onMessageReceived: (JavaScriptMessage message) async {
    final Map<String, dynamic> data = jsonDecode(message.message);
    
    // Trigger Native System Notification
    const AndroidNotificationDetails androidDetails = AndroidNotificationDetails(
      'namate_id', 'Namate Updates',
      importance: Importance.max,
      priority: Priority.high,
    );
    const DarwinNotificationDetails iosDetails = DarwinNotificationDetails();
    const NotificationDetails details = NotificationDetails(
      android: androidDetails,
      iOS: iosDetails,
    );

    await flutterLocalNotificationsPlugin.show(
      0, 
      data['title'], 
      data['body'], 
      details,
      payload: data['link'],
    );
  },
)
```

### Flutter Code for Media Upload (Dart)

This bridge allows the Web App to request the Flutter app to open the native gallery/camera, upload the image to a cloud service (e.g., Cloudinary), and return the URL.

```dart
..addJavaScriptChannel(
  'FlutterMediaChannel',
  onMessageReceived: (JavaScriptMessage message) async {
    final Map<String, dynamic> data = jsonDecode(message.message);
    
    if (data['type'] == 'PICK_IMAGE') {
      // 1. Open Native Picker
      // 2. Upload to your Storage (Cloudinary/S3/etc)
      // 3. Return the URL
      final String uploadedUrl = "https://your-cloud.com/image.jpg";
      
      _controller.runJavaScript("window.onFlutterMediaUpload('$uploadedUrl', '${data['requestId']}')");
    }
  },
)
```

## 2. Integrated Code Example (The Bridge)

This example shows how to set up the `WebViewController` to handle Payments, Notifications, and Media:

```dart
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:cashfree_pg/cashfree_pg.dart';

class WebCheckoutPage extends StatefulWidget {
  @override
  _WebCheckoutPageState createState() => _WebCheckoutPageState();
}

class _WebCheckoutPageState extends State<WebCheckoutPage> {
  late final WebViewController _controller;

  @override
  void initState() {
    super.initState();

    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..addJavaScriptChannel(
        'FlutterPaymentChannel',
        onMessageReceived: (JavaScriptMessage message) {
          final Map<String, dynamic> data = jsonDecode(message.message);
          if (data['type'] == 'CASHFREE_PAYMENT') {
            // Open native Cashfree Checkout
            // For example using cashfree_pg package:
            var session = CFSessionBuilder()
                .setEnvironment(CFEnvironment.SANDBOX) // or PRODUCTION
                .setPaymentSessionId(data['paymentSessionId'])
                .build();
            
            // Initiate Web Checkout or Drop-in
            // ... implementation details ...
          }
        },
      )
      ..addJavaScriptChannel(
        'FlutterNotificationChannel',
        onMessageReceived: (JavaScriptMessage message) async {
          final Map<String, dynamic> data = jsonDecode(message.message);
          // Show Local Notification...
        },
      )
      ..addJavaScriptChannel(
        'FlutterMediaChannel',
        onMessageReceived: (JavaScriptMessage message) async {
           final Map<String, dynamic> data = jsonDecode(message.message);
           if (data['type'] == 'PICK_IMAGE' || data['type'] == 'PICK_VIDEO') {
             // 1. Open Native Picker
             // 2. Upload to Cloud
             // 3. Callback to JS
             String url = "https://your-storage.com/${data['requestId']}.jpg";
             _controller.runJavaScript("window.onFlutterMediaUpload('$url', '${data['requestId']}')");
           }
        },
      )
      ..loadRequest(Uri.parse('https://your-namate-url.com/'));
  }

  // Handle Cashfree completion callbacks from native side:
  void _onPaymentSuccess(String orderId) {
    _controller.runJavaScript("window.onFlutterPaymentSuccess('$orderId')");
  }

  void _onPaymentError(String error) {
    _controller.runJavaScript("window.onFlutterPaymentError('$error')");
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(child: WebViewWidget(controller: _controller)),
    );
  }
}
```

## 3. Communication Flow

1. **Payments**: Web calls `FlutterPaymentChannel`. Flutter opens native Cashfree, then calls `window.onFlutterPaymentSuccess`.
2. **Notifications**: Web sends real-time updates to `FlutterNotificationChannel`. Flutter shows a native system tray notification.
3. **Media Upload**: Web calls `FlutterMediaChannel`. Flutter opens high-quality native camera/gallery, uploads to cloud, and returns the URL.
4. **Links**: Both Web and App can handle shared links. Append `?ref=YOUR_CODE` to tracking referral points.
