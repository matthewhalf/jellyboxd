const fs = require('fs');
const path = require('path');

const jsiDir = path.join(__dirname, '..', 'node_modules', 'expo-modules-jsi');

if (fs.existsSync(jsiDir)) {
  console.log('🩹 Patching expo-modules-jsi for Swift 6.2 / Xcode 26 compatibility...');
  let patchCount = 0;

  // ───────────────────────────────────────────────────────────────────────────
  // 1. Package.swift: swiftLanguageModes: [.v6] → [.v5]
  //    This is the ROOT CAUSE — the SPM build inside build-xcframework.sh uses
  //    Package.swift and compiles with Swift 6 strict concurrency, causing
  //    "sending ... risks causing data races" errors in JavaScriptRuntime.swift
  // ───────────────────────────────────────────────────────────────────────────
  const packageSwiftPath = path.join(jsiDir, 'apple', 'Package.swift');
  if (fs.existsSync(packageSwiftPath)) {
    let content = fs.readFileSync(packageSwiftPath, 'utf8');
    if (content.includes('swiftLanguageModes: [.v6]')) {
      content = content.replace('swiftLanguageModes: [.v6]', 'swiftLanguageModes: [.v5]');
      fs.writeFileSync(packageSwiftPath, content, 'utf8');
      console.log('  ✓ Patched Package.swift: swiftLanguageModes .v6 → .v5');
      patchCount++;
    } else if (content.includes('swiftLanguageModes: [.v5]')) {
      console.log('  ⏭ Package.swift already patched to .v5');
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 2. Podspec: s.swift_version = '6.0' → '5.0'
  //    Ensures CocoaPods also compiles with Swift 5 language mode
  // ───────────────────────────────────────────────────────────────────────────
  const podspecPath = path.join(jsiDir, 'apple', 'ExpoModulesJSI.podspec');
  if (fs.existsSync(podspecPath)) {
    let content = fs.readFileSync(podspecPath, 'utf8');
    if (content.includes("s.swift_version  = '6.0'")) {
      content = content.replace("s.swift_version  = '6.0'", "s.swift_version  = '5.0'");
      fs.writeFileSync(podspecPath, content, 'utf8');
      console.log('  ✓ Patched podspec: swift_version 6.0 → 5.0');
      patchCount++;
    } else if (content.includes("s.swift_version  = '5.0'")) {
      console.log('  ⏭ Podspec already patched to 5.0');
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 3. build-xcframework.sh: Add SWIFT_VERSION=5.0 and
  //    SWIFT_STRICT_CONCURRENCY=minimal to the nested xcodebuild call.
  //    The script uses `env -i` which strips all inherited build settings,
  //    so we must inject these directly into the xcodebuild invocation.
  // ───────────────────────────────────────────────────────────────────────────
  const buildScriptPath = path.join(jsiDir, 'apple', 'scripts', 'build-xcframework.sh');
  if (fs.existsSync(buildScriptPath)) {
    let content = fs.readFileSync(buildScriptPath, 'utf8');
    if (!content.includes('SWIFT_STRICT_CONCURRENCY=minimal')) {
      // Add SWIFT_VERSION and SWIFT_STRICT_CONCURRENCY before CLANG_ENABLE_CODE_COVERAGE
      content = content.replace(
        'CLANG_ENABLE_CODE_COVERAGE=NO',
        'SWIFT_VERSION=5.0 \\\n    SWIFT_STRICT_CONCURRENCY=minimal \\\n    CLANG_ENABLE_CODE_COVERAGE=NO'
      );
      fs.writeFileSync(buildScriptPath, content, 'utf8');
      console.log('  ✓ Patched build-xcframework.sh: added SWIFT_VERSION=5.0 + SWIFT_STRICT_CONCURRENCY=minimal');
      patchCount++;
    } else {
      console.log('  ⏭ build-xcframework.sh already patched');
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 4. Fix 'weak let' → 'weak var' in all Swift files
  //    Swift 6.2 rejects `weak let` — property must be `var`
  // ───────────────────────────────────────────────────────────────────────────
  function replaceInDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        replaceInDir(fullPath);
      } else if (entry.name.endsWith('.swift')) {
        let content = fs.readFileSync(fullPath, 'utf8');
        if (content.includes('weak let runtime:')) {
          content = content.replace(/weak let runtime:/g, 'weak var runtime:');
          fs.writeFileSync(fullPath, content, 'utf8');
          console.log(`  ✓ Patched weak var in: ${entry.name}`);
          patchCount++;
        }
      }
    }
  }

  replaceInDir(path.join(jsiDir, 'apple', 'Sources'));

  // ───────────────────────────────────────────────────────────────────────────
  // 5. Fix SWIFT_RETURNS_RETAINED on RuntimeScheduler constructors
  // ───────────────────────────────────────────────────────────────────────────
  const headerPath = path.join(jsiDir, 'apple', 'Sources', 'ExpoModulesJSI-Cxx', 'include', 'RuntimeScheduler.h');
  if (fs.existsSync(headerPath)) {
    let header = fs.readFileSync(headerPath, 'utf8');
    if (header.includes('SWIFT_RETURNS_RETAINED RuntimeScheduler(')) {
      header = header.replace(/SWIFT_RETURNS_RETAINED RuntimeScheduler\(/g, 'RuntimeScheduler(');
      fs.writeFileSync(headerPath, header, 'utf8');
      console.log('  ✓ Patched RuntimeScheduler.h constructors');
      patchCount++;
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 6. Fix @unchecked Sendable on classes with mutable weak runtime references
  // ───────────────────────────────────────────────────────────────────────────
  const sendablePatches = [
    {
      file: path.join(jsiDir, 'apple', 'Sources', 'ExpoModulesJSI', 'Runtime', 'JavaScriptPropNameID.swift'),
      find: /public final class JavaScriptPropNameID:\s*JavaScriptType(?!\s*,\s*@unchecked Sendable)/g,
      replace: 'public final class JavaScriptPropNameID: JavaScriptType, @unchecked Sendable',
      name: 'JavaScriptPropNameID.swift'
    },
    {
      file: path.join(jsiDir, 'apple', 'Sources', 'ExpoModulesJSI', 'Runtime', 'Values', 'JavaScriptValue.swift'),
      find: /public final class JavaScriptValue:\s*JavaScriptType,\s*Equatable,\s*Escapable(?!\s*,\s*@unchecked Sendable)/g,
      replace: 'public final class JavaScriptValue: JavaScriptType, Equatable, Escapable, @unchecked Sendable',
      name: 'JavaScriptValue.swift'
    },
    {
      file: path.join(jsiDir, 'apple', 'Sources', 'ExpoModulesJSI', 'Runtime', 'Values', 'JavaScriptError.swift'),
      find: /public final class JavaScriptError:\s*Error,\s*Sendable\b/g,
      replace: 'public final class JavaScriptError: Error, @unchecked Sendable',
      name: 'JavaScriptError.swift'
    }
  ];

  for (const patch of sendablePatches) {
    if (fs.existsSync(patch.file)) {
      let content = fs.readFileSync(patch.file, 'utf8');
      if (patch.find.test(content)) {
        // Reset regex lastIndex since we tested it above
        patch.find.lastIndex = 0;
        content = content.replace(patch.find, patch.replace);
        fs.writeFileSync(patch.file, content, 'utf8');
        console.log(`  ✓ Patched @unchecked Sendable in: ${patch.name}`);
        patchCount++;
      }
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 7. Remove NonisolatedNonsendingByDefault and InferIsolatedConformances
  //    upcoming features from Package.swift — these are Swift 6-only features
  //    that cause build failures when compiling in Swift 5 mode
  // ───────────────────────────────────────────────────────────────────────────
  if (fs.existsSync(packageSwiftPath)) {
    let content = fs.readFileSync(packageSwiftPath, 'utf8');
    let changed = false;

    // Remove the lines that enable these upcoming features (they're Swift 6 only)
    const featureLines = [
      /\s*\.enableUpcomingFeature\("NonisolatedNonsendingByDefault"\),?\n/g,
      /\s*\.enableUpcomingFeature\("InferIsolatedConformances"\),?\n/g,
      /\s*\/\/ Enable some upcoming features.*\n/g,
      /\s*\/\/ https:\/\/github\.com\/swiftlang\/swift-evolution\/blob\/main\/proposals\/0461.*\n/g,
      /\s*\/\/ https:\/\/github\.com\/swiftlang\/swift-evolution\/blob\/main\/proposals\/0470.*\n/g,
    ];
    for (const regex of featureLines) {
      if (regex.test(content)) {
        regex.lastIndex = 0;
        content = content.replace(regex, '');
        changed = true;
      }
    }

    if (changed) {
      fs.writeFileSync(packageSwiftPath, content, 'utf8');
      console.log('  ✓ Removed Swift 6 upcoming features from Package.swift');
      patchCount++;
    }
  }

  console.log(`✅ expo-modules-jsi patch complete (${patchCount} patches applied).`);
} else {
  console.log('⚠️ expo-modules-jsi directory not found, skipping patch.');
}
