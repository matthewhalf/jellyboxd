const fs = require('fs');
const path = require('path');

const jsiDir = path.join(__dirname, '..', 'node_modules', 'expo-modules-jsi');

if (fs.existsSync(jsiDir)) {
  console.log('🩹 Patching expo-modules-jsi for Swift 6.2 / Xcode 26 compatibility...');

  // 1. Fix 'weak let' -> 'weak var' in all Swift files
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
        }
      }
    }
  }

  replaceInDir(path.join(jsiDir, 'apple', 'Sources'));

  // 2. Fix SWIFT_RETURNS_RETAINED on RuntimeScheduler constructors in RuntimeScheduler.h
  const headerPath = path.join(jsiDir, 'apple', 'Sources', 'ExpoModulesJSI-Cxx', 'include', 'RuntimeScheduler.h');
  if (fs.existsSync(headerPath)) {
    let header = fs.readFileSync(headerPath, 'utf8');
    if (header.includes('SWIFT_RETURNS_RETAINED RuntimeScheduler(')) {
      header = header.replace(/SWIFT_RETURNS_RETAINED RuntimeScheduler\(/g, 'RuntimeScheduler(');
      fs.writeFileSync(headerPath, header, 'utf8');
      console.log('  ✓ Patched RuntimeScheduler.h constructors');
    }
  }

  console.log('✅ expo-modules-jsi patch applied successfully.');
} else {
  console.log('⚠️ expo-modules-jsi directory not found, skipping patch.');
}
