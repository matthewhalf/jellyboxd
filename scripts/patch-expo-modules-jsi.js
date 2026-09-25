const fs = require('fs');
const path = require('path');

const jsiDir = path.join(__dirname, '..', 'node_modules', 'expo-modules-jsi');

if (fs.existsSync(jsiDir)) {
  console.log('🩹 Patching expo-modules-jsi for Swift 6 / Xcode 26 compatibility...');
  let patchCount = 0;

  // ───────────────────────────────────────────────────────────────────────────
  // 1. Package.swift:
  //    - Remove experimental features (NonisolatedNonsendingByDefault, InferIsolatedConformances)
  //    - Add -strict-concurrency=targeted to unsafeFlags
  // ───────────────────────────────────────────────────────────────────────────
  const packageSwiftPath = path.join(jsiDir, 'apple', 'Package.swift');
  if (fs.existsSync(packageSwiftPath)) {
    let content = fs.readFileSync(packageSwiftPath, 'utf8');
    let changed = false;

    // Remove upcoming features that cause data-race checking failures
    if (content.includes('.enableUpcomingFeature("NonisolatedNonsendingByDefault")')) {
      content = content.replace(/\s*\.enableUpcomingFeature\("NonisolatedNonsendingByDefault"\),?/g, '');
      changed = true;
    }
    if (content.includes('.enableUpcomingFeature("InferIsolatedConformances")')) {
      content = content.replace(/\s*\.enableUpcomingFeature\("InferIsolatedConformances"\),?/g, '');
      changed = true;
    }

    // Add -strict-concurrency=targeted to unsafeFlags
    if (!content.includes('"-strict-concurrency=targeted"')) {
      content = content.replace(
        '".unsafeFlags([',
        '".unsafeFlags([\n          "-strict-concurrency=targeted",'
      );
      if (!content.includes('"-strict-concurrency=targeted"')) {
        content = content.replace(
          '.unsafeFlags([',
          '.unsafeFlags([\n          "-strict-concurrency=targeted",'
        );
      }
      changed = true;
    }

    if (changed) {
      fs.writeFileSync(packageSwiftPath, content, 'utf8');
      console.log('  ✓ Patched Package.swift: relaxed concurrency to targeted and removed experimental features');
      patchCount++;
    } else {
      console.log('  ⏭ Package.swift already up to date');
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 2. build-xcframework.sh:
  //    - Remove -quiet so build output / errors are visible
  //    - Inject SWIFT_STRICT_CONCURRENCY=targeted and SWIFT_TREAT_WARNINGS_AS_ERRORS=NO into xcodebuild
  // ───────────────────────────────────────────────────────────────────────────
  const buildScriptPath = path.join(jsiDir, 'apple', 'scripts', 'build-xcframework.sh');
  if (fs.existsSync(buildScriptPath)) {
    let content = fs.readFileSync(buildScriptPath, 'utf8');
    let changed = false;

    // Remove -quiet flag from the xcodebuild command
    if (content.includes('-quiet')) {
      content = content.replace(/^[ \t]*-quiet[ \t]*\\\n/gm, '');
      changed = true;
      console.log('  ✓ Removed -quiet from build-xcframework.sh');
    }

    // Inject settings into the xcodebuild command inside build_slice()
    if (!content.includes('SWIFT_STRICT_CONCURRENCY=targeted')) {
      content = content.replace(
        'SWIFT_COMPILATION_MODE=wholemodule \\',
        'SWIFT_COMPILATION_MODE=wholemodule \\\n    SWIFT_STRICT_CONCURRENCY=targeted \\\n    SWIFT_TREAT_WARNINGS_AS_ERRORS=NO \\'
      );
      changed = true;
      console.log('  ✓ Added SWIFT_STRICT_CONCURRENCY=targeted to build-xcframework.sh');
    }

    if (changed) {
      fs.writeFileSync(buildScriptPath, content, 'utf8');
      patchCount++;
    } else {
      console.log('  ⏭ build-xcframework.sh already patched');
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 3. Fix 'weak let' -> 'weak var' in all Swift files (Swift 6.2 requirement)
  // ───────────────────────────────────────────────────────────────────────────
  function replaceInDir(dir) {
    if (!fs.existsSync(dir)) return;
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
  // 4. RuntimeScheduler.h: Fix SWIFT_RETURNS_RETAINED constructors
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
  // 5. Sendable conformance on classes with mutable weak runtime references
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
    },
    {
      file: path.join(jsiDir, 'apple', 'Sources', 'ExpoModulesJSI', 'Contexts', 'HostFunctionContext.swift'),
      find: /internal final class HostFunctionContext:\s*HostCallbackContext,\s*Sendable/g,
      replace: 'internal final class HostFunctionContext: HostCallbackContext, @unchecked Sendable',
      name: 'HostFunctionContext.swift'
    },
    {
      file: path.join(jsiDir, 'apple', 'Sources', 'ExpoModulesJSI', 'Contexts', 'HostFunctionContext.swift'),
      find: /internal final class UnownedThisHostFunctionContext:\s*HostCallbackContext,\s*Sendable/g,
      replace: 'internal final class UnownedThisHostFunctionContext: HostCallbackContext, @unchecked Sendable',
      name: 'UnownedThisHostFunctionContext.swift'
    },
    {
      file: path.join(jsiDir, 'apple', 'Sources', 'ExpoModulesJSI', 'Contexts', 'HostObjectContext.swift'),
      find: /internal final class HostObjectContext:\s*HostCallbackContext,\s*Sendable/g,
      replace: 'internal final class HostObjectContext: HostCallbackContext, @unchecked Sendable',
      name: 'HostObjectContext.swift'
    }
  ];

  for (const patch of sendablePatches) {
    if (fs.existsSync(patch.file)) {
      let content = fs.readFileSync(patch.file, 'utf8');
      if (patch.find.test(content)) {
        patch.find.lastIndex = 0;
        content = content.replace(patch.find, patch.replace);
        fs.writeFileSync(patch.file, content, 'utf8');
        console.log(`  ✓ Patched @unchecked Sendable in: ${patch.name}`);
        patchCount++;
      }
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 6. JavaScriptRuntime.swift:
  //    - Fix line 476: replace raw `var result` capture with `NonisolatedUnsafeVar`
  //      (same pattern as already used on line 513)
  //    - Remove erroneous `sending` keywords from method signatures
  // ───────────────────────────────────────────────────────────────────────────
  const runtimeSwiftPath = path.join(jsiDir, 'apple', 'Sources', 'ExpoModulesJSI', 'Runtime', 'JavaScriptRuntime.swift');
  if (fs.existsSync(runtimeSwiftPath)) {
    let content = fs.readFileSync(runtimeSwiftPath, 'utf8');
    let changed = false;

    // Fix raw var result capture in synchronous execute
    const oldSyncExecute = `    var result: Result<R, any Error>!
    nonisolated(unsafe) let callerRunLoop = CFRunLoopGetCurrent()

    scheduler.scheduleTask(.ImmediatePriority) {
      do {
        result = .success(try JavaScriptActor.assumeIsolated(closure))
      } catch {
        result = .failure(error)
      }
      // Wake the caller's run loop so its \`CFRunLoopRunInMode(...)\` returns immediately
      // instead of waiting out the timeout backstop.
      CFRunLoopPerformBlock(callerRunLoop, CFRunLoopMode.commonModes.rawValue) {}
      CFRunLoopWakeUp(callerRunLoop)
    }

    // Pump the caller's run loop until the task finishes. As opposed to DispatchSemaphore
    // or DispatchGroup, this lets the run loop continue to process other events in the meantime,
    // and the spin is also faster than a real kernel-mediated context switch when the JS work
    // is short (the common case). The 100ms timeout is a backstop in case the wakeup is missed;
    // the common path is woken by \`CFRunLoopWakeUp\` from the scheduled block above.
    //
    // \`CFRunLoopRunInMode\` is the C API rather than \`RunLoop.current.run(mode:before:)\` to
    // avoid the per-iteration \`+[NSRunLoop currentRunLoop]\` autorelease push and \`Date()\`
    // allocation that dominated the caller-thread profile otherwise.
    while result == nil {
      CFRunLoopRunInMode(.commonModes, 0.1, false)
    }
    return try result.get()`;

    const newSyncExecute = `    let result = NonisolatedUnsafeVar<Result<R, any Error>>()
    let callerRunLoop = NonisolatedUnsafeVar(CFRunLoopGetCurrent())

    scheduler.scheduleTask(.ImmediatePriority) {
      do {
        result.value = .success(try JavaScriptActor.assumeIsolated(closure))
      } catch {
        result.value = .failure(error)
      }
      // Wake the caller's run loop so its \`CFRunLoopRunInMode(...)\` returns immediately
      // instead of waiting out the timeout backstop.
      CFRunLoopPerformBlock(callerRunLoop.value, CFRunLoopMode.commonModes.rawValue) {}
      CFRunLoopWakeUp(callerRunLoop.value)
    }

    // Pump the caller's run loop until the task finishes.
    while result.value == nil {
      CFRunLoopRunInMode(.commonModes, 0.1, false)
    }
    return try result.value.get()`;

    if (content.includes('var result: Result<R, any Error>!')) {
      content = content.replace(oldSyncExecute, newSyncExecute);
      changed = true;
      console.log('  ✓ Fixed raw var result capture in JavaScriptRuntime.swift');
    }

    // Strip conflicting `sending` annotations from signatures
    if (content.includes('sending')) {
      content = content.replace(/\bfunction:\s*sending\s*@escaping/g, 'function: @escaping');
      content = content.replace(/_\s*function:\s*sending\s*@escaping/g, '_ function: @escaping');
      content = content.replace(/->\s*sending\s+Void/g, '-> Void');
      content = content.replace(/->\s*sending\s+R\b/g, '-> R');
      content = content.replace(/throws\s*->\s*sending\s+R\b/g, 'throws -> R');
      changed = true;
      console.log('  ✓ Cleaned up sending annotations in JavaScriptRuntime.swift');
    }

    if (changed) {
      fs.writeFileSync(runtimeSwiftPath, content, 'utf8');
      patchCount++;
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 7. Strip `sending` from all remaining Swift files in ExpoModulesJSI
  // ───────────────────────────────────────────────────────────────────────────
  const sendingFiles = [
    path.join(jsiDir, 'apple', 'Sources', 'ExpoModulesJSI', 'Runtime', 'Values', 'JavaScriptObject.swift'),
    path.join(jsiDir, 'apple', 'Sources', 'ExpoModulesJSI', 'Runtime', 'Values', 'JavaScriptPromise.swift'),
    path.join(jsiDir, 'apple', 'Sources', 'ExpoModulesJSI', 'Utilities', 'DeferredPromise.swift'),
    path.join(jsiDir, 'apple', 'Sources', 'ExpoModulesJSI', 'Runtime', 'JavaScriptActor.swift'),
    path.join(jsiDir, 'apple', 'Sources', 'ExpoModulesJSI', 'Extensions', 'Task+immediate.swift'),
    path.join(jsiDir, 'apple', 'Sources', 'ExpoModulesJSI', 'Runtime', 'JavaScriptRef.swift'),
  ];

  for (const file of sendingFiles) {
    if (fs.existsSync(file)) {
      let content = fs.readFileSync(file, 'utf8');
      if (content.includes('sending')) {
        content = content.replace(/\bconsuming\s+sending\b/g, 'consuming');
        content = content.replace(/\bsending\s+@escaping\b/g, '@escaping');
        content = content.replace(/->\s*sending\s+/g, '-> ');
        content = content.replace(/\(_\s*value:\s*sending\s+/g, '(_ value: ');
        content = content.replace(/\(_\s*error:\s*sending\s+/g, '(_ error: ');
        content = content.replace(/rethrows\s*->\s*sending\s+/g, 'rethrows -> ');
        fs.writeFileSync(file, content, 'utf8');
        console.log(`  ✓ Stripped sending in: ${path.basename(file)}`);
        patchCount++;
      }
    }
  }

  console.log(`✅ expo-modules-jsi patch complete (${patchCount} patches applied).`);
} else {
  console.log('⚠️ expo-modules-jsi directory not found, skipping patch.');
}
