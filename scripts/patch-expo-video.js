const fs = require('fs');
const path = require('path');

// Backport of expo/expo#50486 (expo-video 58): on iOS 27 AVKit sets up the native controls only
// in viewDidAppear, and VideoView.didMoveToWindow() begins an appearance transition it never ends.
// The stuck AVPlayerViewController then crashes the app (UIKit hierarchy exception) on entering fullscreen.
const viewPath = path.join(__dirname, '..', 'node_modules', 'expo-video', 'ios', 'VideoView.swift');
const begin = 'playerViewController.beginAppearanceTransition(self.window != nil, animated: true)\n';
const end = '    playerViewController.endAppearanceTransition()\n';

if (fs.existsSync(viewPath)) {
  const content = fs.readFileSync(viewPath, 'utf8');
  if (content.includes(begin + end)) {
    console.log('  ⏭ expo-video VideoView.swift already patched');
  } else if (content.includes(begin)) {
    fs.writeFileSync(viewPath, content.replace(begin, begin + end), 'utf8');
    console.log('🩹 Patched expo-video VideoView.swift: balanced appearance transition (iOS 27 fullscreen crash)');
  } else {
    console.warn('⚠️ expo-video VideoView.swift changed upstream: iOS 27 patch not applied, check if still needed');
  }
}
