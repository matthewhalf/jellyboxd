const fs = require('fs');
const path = require('path');

const jsiDir = path.join(__dirname, '..', 'node_modules', 'expo-modules-jsi');

if (fs.existsSync(jsiDir)) {
  console.log('🩹 Patching expo-modules-jsi for Swift 6 / Xcode 26 compatibility...');
  let patchCount = 0;

  // ───────────────────────────────────────────────────────────────────────────
  // 1. Package.swift:
  //    - Remove experimental upcoming features (NonisolatedNonsendingByDefault, InferIsolatedConformances)
  // ───────────────────────────────────────────────────────────────────────────
  const packageSwiftPath = path.join(jsiDir, 'apple', 'Package.swift');
  if (fs.existsSync(packageSwiftPath)) {
    let content = fs.readFileSync(packageSwiftPath, 'utf8');
    let changed = false;

    if (content.includes('.enableUpcomingFeature("NonisolatedNonsendingByDefault")')) {
      content = content.replace(/\s*\.enableUpcomingFeature\("NonisolatedNonsendingByDefault"\),?/g, '');
      changed = true;
    }
    if (content.includes('.enableUpcomingFeature("InferIsolatedConformances")')) {
      content = content.replace(/\s*\.enableUpcomingFeature\("InferIsolatedConformances"\),?/g, '');
      changed = true;
    }
    if (content.includes('"-strict-concurrency=targeted"')) {
      content = content.replace(/\s*"-strict-concurrency=targeted",?/g, '');
      changed = true;
    }

    if (changed) {
      fs.writeFileSync(packageSwiftPath, content, 'utf8');
      console.log('  ✓ Patched Package.swift: removed experimental upcoming features');
      patchCount++;
    } else {
      console.log('  ⏭ Package.swift already up to date');
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 2. build-xcframework.sh:
  //    - Remove -quiet so build output / errors are visible in CI
  //    - Add SWIFT_TREAT_WARNINGS_AS_ERRORS=NO so warnings never break the build
  // ───────────────────────────────────────────────────────────────────────────
  const buildScriptPath = path.join(jsiDir, 'apple', 'scripts', 'build-xcframework.sh');
  if (fs.existsSync(buildScriptPath)) {
    let content = fs.readFileSync(buildScriptPath, 'utf8');
    let changed = false;

    if (content.includes('-quiet')) {
      content = content.replace(/^[ \t]*-quiet[ \t]*\\\n/gm, '');
      changed = true;
      console.log('  ✓ Removed -quiet from build-xcframework.sh');
    }

    if (content.includes('SWIFT_STRICT_CONCURRENCY=targeted \\\n')) {
      content = content.replace('SWIFT_STRICT_CONCURRENCY=targeted \\\n', '');
      changed = true;
    }

    if (!content.includes('SWIFT_TREAT_WARNINGS_AS_ERRORS=NO')) {
      content = content.replace(
        'SWIFT_COMPILATION_MODE=wholemodule \\',
        'SWIFT_COMPILATION_MODE=wholemodule \\\n    SWIFT_TREAT_WARNINGS_AS_ERRORS=NO \\'
      );
      changed = true;
      console.log('  ✓ Added SWIFT_TREAT_WARNINGS_AS_ERRORS=NO to build-xcframework.sh');
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
  //    - Replace raw pointer captures with NonisolatedUnsafeVar (fixes lines 193, 781, 823)
  //    - Fix line 476: replace raw `var result` capture with `NonisolatedUnsafeVar`
  //    - Remove conflicting `sending` annotations from signatures
  // ───────────────────────────────────────────────────────────────────────────
  const runtimeSwiftPath = path.join(jsiDir, 'apple', 'Sources', 'ExpoModulesJSI', 'Runtime', 'JavaScriptRuntime.swift');
  if (fs.existsSync(runtimeSwiftPath)) {
    let content = fs.readFileSync(runtimeSwiftPath, 'utf8');
    let changed = false;

    // Fix getter resultPtr capture (line 188)
    if (content.includes('nonisolated(unsafe) let resultPtr = resultPtr\n\n      return withGuaranteedContext')) {
      content = content.replace(
        'nonisolated(unsafe) let resultPtr = resultPtr\n\n      return withGuaranteedContext(context) { (context: HostObjectContext, runtime) in\n        return JavaScriptActor.assumeIsolated {\n          return forwardingSwiftErrorsToJS(runtime: runtime) {\n            try context.get(propertyName).writeJSIValue(to: resultPtr)',
        'let resultPtrVar = NonisolatedUnsafeVar(resultPtr)\n\n      return withGuaranteedContext(context) { (context: HostObjectContext, runtime) in\n        return JavaScriptActor.assumeIsolated {\n          return forwardingSwiftErrorsToJS(runtime: runtime) {\n            try context.get(propertyName).writeJSIValue(to: resultPtrVar.value)'
      );
      changed = true;
      console.log('  ✓ Fixed resultPtr capture in getter (JavaScriptRuntime.swift)');
    }

    // Fix owning-this createFunctionClosure pointer captures (lines 770-785)
    const oldFn1 = `    nonisolated(unsafe) let thisPtr = thisPtr
    nonisolated(unsafe) let argumentsPtr = argumentsPtr
    nonisolated(unsafe) let resultPtr = resultPtr

    // See \`withGuaranteedContext\` for why neither the context nor the runtime is retained here, and
    // why the result is written to the caller's slot instead of being returned.
    return withGuaranteedContext(context) { (context: HostFunctionContext, runtime) in
      return JavaScriptActor.assumeIsolated {
        return forwardingSwiftErrorsToJS(runtime: runtime) {
          let this = UnsafeMutablePointer(mutating: thisPtr).move()
          let arguments = JavaScriptValuesBuffer(runtime, start: argumentsPtr, count: argumentsCount)
          let thisValue = JavaScriptValue(runtime, this)
          try context.call(thisValue, consume arguments).writeJSIValue(to: resultPtr)
        }
      }
    }`;

    const newFn1 = `    let thisPtrVar = NonisolatedUnsafeVar(thisPtr)
    let argumentsPtrVar = NonisolatedUnsafeVar(argumentsPtr)
    let resultPtrVar = NonisolatedUnsafeVar(resultPtr)

    return withGuaranteedContext(context) { (context: HostFunctionContext, runtime) in
      return JavaScriptActor.assumeIsolated {
        return forwardingSwiftErrorsToJS(runtime: runtime) {
          let this = UnsafeMutablePointer(mutating: thisPtrVar.value).move()
          let arguments = JavaScriptValuesBuffer(runtime, start: argumentsPtrVar.value, count: argumentsCount)
          let thisValue = JavaScriptValue(runtime, this)
          try context.call(thisValue, consume arguments).writeJSIValue(to: resultPtrVar.value)
        }
      }
    }`;

    if (content.includes(oldFn1)) {
      content = content.replace(oldFn1, newFn1);
      changed = true;
      console.log('  ✓ Fixed pointer captures in createFunctionClosure owning-this (JavaScriptRuntime.swift)');
    }

    // Fix unowned-this createFunctionClosure pointer captures (lines 810-825)
    const oldFn2 = `    nonisolated(unsafe) let thisPtr = thisPtr
    nonisolated(unsafe) let argumentsPtr = argumentsPtr
    nonisolated(unsafe) let resultPtr = resultPtr

    // See \`withGuaranteedContext\` for why neither the context nor the runtime is retained here, and
    // why the result is written to the caller's slot instead of being returned.
    return withGuaranteedContext(context) { (context: UnownedThisHostFunctionContext, runtime) in
      return JavaScriptActor.assumeIsolated {
        return forwardingSwiftErrorsToJS(runtime: runtime) {
          let arguments = JavaScriptValuesBuffer(runtime, start: argumentsPtr, count: argumentsCount)
          let thisValue = JavaScriptUnownedValue(runtime.pointee, thisPtr)
          try context.call(thisValue, consume arguments).writeJSIValue(to: resultPtr)
        }
      }
    }`;

    const newFn2 = `    let thisPtrVar = NonisolatedUnsafeVar(thisPtr)
    let argumentsPtrVar = NonisolatedUnsafeVar(argumentsPtr)
    let resultPtrVar = NonisolatedUnsafeVar(resultPtr)

    return withGuaranteedContext(context) { (context: UnownedThisHostFunctionContext, runtime) in
      return JavaScriptActor.assumeIsolated {
        return forwardingSwiftErrorsToJS(runtime: runtime) {
          let arguments = JavaScriptValuesBuffer(runtime, start: argumentsPtrVar.value, count: argumentsCount)
          let thisValue = JavaScriptUnownedValue(runtime.pointee, thisPtrVar.value)
          try context.call(thisValue, consume arguments).writeJSIValue(to: resultPtrVar.value)
        }
      }
    }`;

    if (content.includes(oldFn2)) {
      content = content.replace(oldFn2, newFn2);
      changed = true;
      console.log('  ✓ Fixed pointer captures in createFunctionClosure unowned-this (JavaScriptRuntime.swift)');
    }

    // Fix raw var result capture in synchronous execute (line 476)
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
  // 7. Task+immediate.swift: Wrap operation closure in NonisolatedUnsafeVar
  // ───────────────────────────────────────────────────────────────────────────
  const taskSwiftPath = path.join(jsiDir, 'apple', 'Sources', 'ExpoModulesJSI', 'Extensions', 'Task+immediate.swift');
  if (fs.existsSync(taskSwiftPath)) {
    let content = fs.readFileSync(taskSwiftPath, 'utf8');
    const oldTask = `    if #available(macOS 26.0, iOS 26.0, watchOS 26.0, tvOS 26.0, *) {
      return Task.immediate(name: name, priority: priority, operation: operation)
    } else {
      // In the polyfill always use the highest priority and hope it executes earlier.
      return Task(name: name, priority: .high, operation: operation)
    }`;

    const newTask = `    let opVar = NonisolatedUnsafeVar(operation)
    if #available(macOS 26.0, iOS 26.0, watchOS 26.0, tvOS 26.0, *) {
      return Task.immediate(name: name, priority: priority, operation: opVar.value)
    } else {
      return Task(name: name, priority: .high, operation: opVar.value)
    }`;

    if (content.includes(oldTask)) {
      content = content.replace(oldTask, newTask);
      fs.writeFileSync(taskSwiftPath, content, 'utf8');
      console.log('  ✓ Fixed operation capture in Task+immediate.swift');
      patchCount++;
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 8. JavaScriptPromise.swift: Wrap resolve/reject arguments in NonisolatedUnsafeVar
  // ───────────────────────────────────────────────────────────────────────────
  const promiseSwiftPath = path.join(jsiDir, 'apple', 'Sources', 'ExpoModulesJSI', 'Runtime', 'Values', 'JavaScriptPromise.swift');
  if (fs.existsSync(promiseSwiftPath)) {
    let content = fs.readFileSync(promiseSwiftPath, 'utf8');
    let changed = false;

    // Encodable resolve: wrap value
    const oldEncodable = `  public func resolve<V: JavaScriptEncodable>(_ value: V) {
    guard let runtime else {
      return
    }
    // \`resolve\` is not isolated, so make sure to jump to JS thread; the encode happens there too.
    runtime.schedule(priority: .immediate) { [longLivedState] in
      // If the promise is already settled, do nothing.
      guard let resolver = longLivedState.resolveFunction.take() else {
        return
      }
      do {
        let encoded = try V.encode(value, in: runtime)`;

    const newEncodable = `  public func resolve<V: JavaScriptEncodable>(_ value: V) {
    guard let runtime else {
      return
    }
    let valueVar = NonisolatedUnsafeVar(value)
    runtime.schedule(priority: .immediate) { [longLivedState] in
      guard let resolver = longLivedState.resolveFunction.take() else {
        return
      }
      do {
        let encoded = try V.encode(valueVar.value, in: runtime)`;

    if (content.includes(oldEncodable)) {
      content = content.replace(oldEncodable, newEncodable);
      changed = true;
      console.log('  ✓ Fixed value capture in encodable resolve (JavaScriptPromise.swift)');
    }

    // Representable resolve: wrap value
    const oldRepresentable = `  public func resolve<V: JavaScriptRepresentable>(_ value: V) {
    guard let runtime else {
      return
    }

    // \`resolve\` is not isolated, so make sure to jump to JS thread.
    runtime.schedule(priority: .immediate) { [longLivedState] in
      // If the promise is already settled, do nothing.
      guard let resolver = longLivedState.resolveFunction.take() else {
        return
      }
      do {
        // Call the actual resolver given in the Promise setup.
        // This will also call \`deferredPromise.resolve\` in the \`then\` handler.
        _ = try resolver.getFunction().call(arguments: value)`;

    const newRepresentable = `  public func resolve<V: JavaScriptRepresentable>(_ value: V) {
    guard let runtime else {
      return
    }
    let valueVar = NonisolatedUnsafeVar(value)
    runtime.schedule(priority: .immediate) { [longLivedState] in
      guard let resolver = longLivedState.resolveFunction.take() else {
        return
      }
      do {
        _ = try resolver.getFunction().call(arguments: valueVar.value)`;

    if (content.includes(oldRepresentable)) {
      content = content.replace(oldRepresentable, newRepresentable);
      changed = true;
      console.log('  ✓ Fixed value capture in representable resolve (JavaScriptPromise.swift)');
    }

    // Reject: wrap error
    const oldReject = `  public func reject(_ error: any Error) {
    guard let runtime else {
      return
    }

    // \`reject\` is not isolated, so make sure to jump to JS thread.
    runtime.schedule(priority: .immediate) { [longLivedState] in
      // If the promise is already settled, do nothing.
      guard let rejecter = longLivedState.rejectFunction.take() else {
        return
      }
      // Convert the error to its JavaScript representation. This preserves an existing
      // \`JavaScriptError\`'s wrapped value and a \`JavaScriptThrowable\`'s structured \`code\`
      // (mirroring the synchronous throw path in \`forwardingSwiftErrorsToJS\`), so the \`code\`
      // is not lost on async rejection. See \`JavaScriptError.from(_:in:)\`.
      let errorValue = JavaScriptError.from(error, in: runtime).toValue()`;

    const newReject = `  public func reject(_ error: any Error) {
    guard let runtime else {
      return
    }
    let errorVar = NonisolatedUnsafeVar(error)
    runtime.schedule(priority: .immediate) { [longLivedState] in
      guard let rejecter = longLivedState.rejectFunction.take() else {
        return
      }
      let errorValue = JavaScriptError.from(errorVar.value, in: runtime).toValue()`;

    if (content.includes(oldReject)) {
      content = content.replace(oldReject, newReject);
      changed = true;
      console.log('  ✓ Fixed error capture in reject (JavaScriptPromise.swift)');
    }

    if (changed) {
      fs.writeFileSync(promiseSwiftPath, content, 'utf8');
      patchCount++;
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 9. Strip `sending` from all remaining Swift files in ExpoModulesJSI
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
