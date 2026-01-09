import Cocoa
import FlutterMacOS
import CoreGraphics
import AVFoundation

@available(macOS 10.14, *)
public class QuickRtcFlutterClientPlugin: NSObject, FlutterPlugin {
    private var screenPickerWindow: NSWindow?
    private var screenPickerResult: FlutterResult?
    
    public static func register(with registrar: FlutterPluginRegistrar) {
        let channel = FlutterMethodChannel(name: "quickrtc_flutter_client", binaryMessenger: registrar.messenger)
        let instance = QuickRtcFlutterClientPlugin()
        registrar.addMethodCallDelegate(instance, channel: channel)
    }

    public func handle(_ call: FlutterMethodCall, result: @escaping FlutterResult) {
        switch call.method {
        case "startScreenCaptureService":
            result(true)
            
        case "stopScreenCaptureService":
            result(true)
            
        case "isScreenCaptureServiceRunning":
            result(true)
            
        case "checkScreenCapturePermission":
            let hasPermission = checkScreenCapturePermission()
            result(hasPermission)
            
        case "requestScreenCapturePermission":
            requestScreenCapturePermission(result: result)
            
        case "openScreenCaptureSettings":
            openScreenCaptureSettings()
            result(true)
            
        case "getScreenSources":
            getScreenSources(result: result)
            
        case "showScreenPicker":
            showScreenPicker(result: result)
            
        case "getPlatformVersion":
            result("macOS " + ProcessInfo.processInfo.operatingSystemVersionString)
            
        default:
            result(FlutterMethodNotImplemented)
        }
    }
    
    // MARK: - Screen Capture Permission
    
    /// Check if screen capture permission is granted using multiple methods
    private func checkScreenCapturePermission() -> Bool {
        if #available(macOS 10.15, *) {
            // Method 1: Use CGPreflightScreenCaptureAccess (most reliable)
            let preflightResult = CGPreflightScreenCaptureAccess()
            if preflightResult {
                return true
            }
            
            // Method 2: Try to get window list - if we can get window names, we have permission
            // This is a fallback check because CGPreflightScreenCaptureAccess can be unreliable
            let windowList = CGWindowListCopyWindowInfo([.optionOnScreenOnly], kCGNullWindowID) as? [[String: Any]] ?? []
            for window in windowList {
                // If we can read window names from other apps, we have permission
                if let ownerPID = window[kCGWindowOwnerPID as String] as? Int32,
                   ownerPID != ProcessInfo.processInfo.processIdentifier,
                   let name = window[kCGWindowName as String] as? String,
                   !name.isEmpty {
                    return true
                }
            }
            
            return false
        } else {
            // On older macOS versions, assume permission is granted
            return true
        }
    }
    
    /// Request screen capture permission
    private func requestScreenCapturePermission(result: @escaping FlutterResult) {
        if #available(macOS 10.15, *) {
            // First check if already granted
            if checkScreenCapturePermission() {
                result(true)
                return
            }
            
            // Request permission - this triggers the system to add the app to the list
            // but doesn't show a dialog on modern macOS - user must go to Settings
            _ = CGRequestScreenCaptureAccess()
            
            // Give the system a moment to process
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { [weak self] in
                let nowGranted = self?.checkScreenCapturePermission() ?? false
                if nowGranted {
                    result(true)
                } else {
                    // Permission not granted - open settings automatically
                    self?.openScreenCaptureSettings()
                    result(false)
                }
            }
        } else {
            result(true)
        }
    }
    
    /// Open System Preferences/Settings to Screen Recording
    private func openScreenCaptureSettings() {
        var urlString: String
        
        if #available(macOS 13.0, *) {
            // macOS Ventura and later - System Settings
            urlString = "x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture"
        } else {
            // macOS Catalina to Monterey - System Preferences
            urlString = "x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture"
        }
        
        if let url = URL(string: urlString) {
            NSWorkspace.shared.open(url)
        }
    }
    
    // MARK: - Screen Sources
    
    /// Get available screen sources (screens and windows)
    private func getScreenSources(result: @escaping FlutterResult) {
        var sources: [[String: Any]] = []
        
        // Get all screens
        let screens = NSScreen.screens
        for (index, screen) in screens.enumerated() {
            let displayID = screen.deviceDescription[NSDeviceDescriptionKey("NSScreenNumber")] as? CGDirectDisplayID ?? 0
            sources.append([
                "id": "screen:\(displayID)",
                "name": index == 0 ? "Main Screen" : "Screen \(index + 1)",
                "type": "screen",
                "displayId": displayID
            ])
        }
        
        // Only try to get windows if we have permission
        if checkScreenCapturePermission() {
            let options: CGWindowListOption = [.optionOnScreenOnly, .excludeDesktopElements]
            if let windowList = CGWindowListCopyWindowInfo(options, kCGNullWindowID) as? [[String: Any]] {
                let currentPID = ProcessInfo.processInfo.processIdentifier
                
                for window in windowList {
                    guard let windowID = window[kCGWindowNumber as String] as? CGWindowID,
                          let ownerPID = window[kCGWindowOwnerPID as String] as? Int32,
                          let ownerName = window[kCGWindowOwnerName as String] as? String,
                          ownerPID != currentPID else {
                        continue
                    }
                    
                    let windowName = window[kCGWindowName as String] as? String ?? ""
                    let layer = window[kCGWindowLayer as String] as? Int ?? 0
                    
                    // Skip system windows and menu bars
                    if layer < 0 || (windowName.isEmpty && ownerName.isEmpty) {
                        continue
                    }
                    
                    let displayName = windowName.isEmpty ? ownerName : "\(ownerName) - \(windowName)"
                    
                    sources.append([
                        "id": "window:\(windowID)",
                        "name": displayName,
                        "type": "window",
                        "windowId": windowID,
                        "ownerName": ownerName
                    ])
                }
            }
        }
        
        result(sources)
    }
    
    // MARK: - Screen Picker
    
    /// Show native screen picker window with preview thumbnails
    private func showScreenPicker(result: @escaping FlutterResult) {
        print("QuickRTC: showScreenPicker called")
        
        // Check permission first
        if !checkScreenCapturePermission() {
            print("QuickRTC: Permission denied")
            result(FlutterError(code: "PERMISSION_DENIED",
                              message: "Screen recording permission not granted",
                              details: nil))
            return
        }
        
        print("QuickRTC: Permission granted, showing picker")
        screenPickerResult = result
        
        DispatchQueue.main.async { [weak self] in
            self?.createAndShowPickerWindow()
        }
    }
    
    private func createAndShowPickerWindow() {
        print("QuickRTC: createAndShowPickerWindow")
        
        // Close existing picker if any
        screenPickerWindow?.close()
        
        // Create picker window
        let windowWidth: CGFloat = 800
        let windowHeight: CGFloat = 600
        
        let screenFrame = NSScreen.main?.frame ?? NSRect(x: 0, y: 0, width: 1920, height: 1080)
        let windowX = (screenFrame.width - windowWidth) / 2
        let windowY = (screenFrame.height - windowHeight) / 2
        
        let window = NSWindow(
            contentRect: NSRect(x: windowX, y: windowY, width: windowWidth, height: windowHeight),
            styleMask: [.titled, .closable],
            backing: .buffered,
            defer: false
        )
        
        window.title = "Choose what to share"
        window.level = .floating
        window.isReleasedWhenClosed = false
        window.delegate = self
        
        // Create content view
        let contentView = ScreenPickerView(frame: NSRect(x: 0, y: 0, width: windowWidth, height: windowHeight))
        contentView.onSourceSelected = { [weak self] sourceInfo in
            print("QuickRTC: Source selected: \(sourceInfo)")
            self?.handleSourceSelected(sourceInfo)
        }
        contentView.onCancel = { [weak self] in
            print("QuickRTC: User cancelled")
            self?.handlePickerCancelled()
        }
        
        window.contentView = contentView
        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
        
        screenPickerWindow = window
        print("QuickRTC: Window created and shown")
        
        // Load sources
        contentView.loadSources()
    }
    
    private func handleSourceSelected(_ sourceInfo: [String: Any]) {
        print("QuickRTC: handleSourceSelected - sending result")
        // Important: Clear the result callback BEFORE closing the window
        // to prevent windowWillClose from sending nil
        let resultCallback = screenPickerResult
        screenPickerResult = nil
        screenPickerWindow?.close()
        screenPickerWindow = nil
        resultCallback?(sourceInfo)
    }
    
    private func handlePickerCancelled() {
        print("QuickRTC: handlePickerCancelled")
        let resultCallback = screenPickerResult
        screenPickerResult = nil
        screenPickerWindow?.close()
        screenPickerWindow = nil
        resultCallback?(nil)
    }
}

// MARK: - NSWindowDelegate
@available(macOS 10.14, *)
extension QuickRtcFlutterClientPlugin: NSWindowDelegate {
    public func windowWillClose(_ notification: Notification) {
        print("QuickRTC: windowWillClose called, screenPickerResult is \(screenPickerResult == nil ? "nil" : "not nil")")
        if let window = notification.object as? NSWindow, window == screenPickerWindow {
            // Only send nil if we haven't already handled the result
            if screenPickerResult != nil {
                print("QuickRTC: Window closed by user without selection - sending nil")
                screenPickerResult?(nil)
                screenPickerResult = nil
            } else {
                print("QuickRTC: Window closed after selection - result already sent")
            }
            screenPickerWindow = nil
        }
    }
}

// MARK: - Screen Picker View
@available(macOS 10.14, *)
class ScreenPickerView: NSView {
    var onSourceSelected: (([String: Any]) -> Void)?
    var onCancel: (() -> Void)?
    
    private var tabView: NSSegmentedControl!
    private var scrollView: NSScrollView!
    private var collectionView: NSCollectionView!
    private var cancelButton: NSButton!
    private var shareButton: NSButton!
    
    private var screenSources: [ScreenSource] = []
    private var windowSources: [ScreenSource] = []
    private var currentTab: Int = 0
    private var selectedSource: ScreenSource?
    
    struct ScreenSource {
        let id: String
        let name: String
        let type: String  // "screen" or "window"
        let thumbnail: NSImage?
        let displayId: CGDirectDisplayID?
        let windowId: CGWindowID?
    }
    
    override init(frame frameRect: NSRect) {
        super.init(frame: frameRect)
        setupUI()
    }
    
    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setupUI()
    }
    
    private func setupUI() {
        wantsLayer = true
        layer?.backgroundColor = NSColor.windowBackgroundColor.cgColor
        
        // Tab control
        tabView = NSSegmentedControl(labels: ["Screens", "Windows"], trackingMode: .selectOne, target: self, action: #selector(tabChanged(_:)))
        tabView.selectedSegment = 0
        tabView.translatesAutoresizingMaskIntoConstraints = false
        addSubview(tabView)
        
        // Collection view for thumbnails
        let flowLayout = NSCollectionViewFlowLayout()
        flowLayout.itemSize = NSSize(width: 220, height: 180)
        flowLayout.minimumInteritemSpacing = 20
        flowLayout.minimumLineSpacing = 20
        flowLayout.sectionInset = NSEdgeInsets(top: 20, left: 20, bottom: 20, right: 20)
        
        collectionView = NSCollectionView()
        collectionView.collectionViewLayout = flowLayout
        collectionView.delegate = self
        collectionView.dataSource = self
        collectionView.isSelectable = true
        collectionView.allowsMultipleSelection = false
        collectionView.backgroundColors = [.clear]
        collectionView.register(ScreenSourceItem.self, forItemWithIdentifier: NSUserInterfaceItemIdentifier("ScreenSourceItem"))
        
        scrollView = NSScrollView()
        scrollView.documentView = collectionView
        scrollView.hasVerticalScroller = true
        scrollView.hasHorizontalScroller = false
        scrollView.translatesAutoresizingMaskIntoConstraints = false
        scrollView.drawsBackground = false
        addSubview(scrollView)
        
        // Cancel button
        cancelButton = NSButton(title: "Cancel", target: self, action: #selector(cancelClicked(_:)))
        cancelButton.bezelStyle = .rounded
        cancelButton.translatesAutoresizingMaskIntoConstraints = false
        addSubview(cancelButton)
        
        // Share button
        shareButton = NSButton(title: "Share", target: self, action: #selector(shareClicked(_:)))
        shareButton.bezelStyle = .rounded
        shareButton.keyEquivalent = "\r"
        shareButton.isEnabled = false
        shareButton.translatesAutoresizingMaskIntoConstraints = false
        shareButton.contentTintColor = .white
        shareButton.layer?.backgroundColor = NSColor.systemBlue.cgColor
        addSubview(shareButton)
        
        // Layout constraints
        NSLayoutConstraint.activate([
            tabView.topAnchor.constraint(equalTo: topAnchor, constant: 20),
            tabView.centerXAnchor.constraint(equalTo: centerXAnchor),
            
            scrollView.topAnchor.constraint(equalTo: tabView.bottomAnchor, constant: 20),
            scrollView.leadingAnchor.constraint(equalTo: leadingAnchor),
            scrollView.trailingAnchor.constraint(equalTo: trailingAnchor),
            scrollView.bottomAnchor.constraint(equalTo: cancelButton.topAnchor, constant: -20),
            
            cancelButton.bottomAnchor.constraint(equalTo: bottomAnchor, constant: -20),
            cancelButton.trailingAnchor.constraint(equalTo: shareButton.leadingAnchor, constant: -10),
            cancelButton.widthAnchor.constraint(equalToConstant: 80),
            
            shareButton.bottomAnchor.constraint(equalTo: bottomAnchor, constant: -20),
            shareButton.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -20),
            shareButton.widthAnchor.constraint(equalToConstant: 80),
        ])
    }
    
    func loadSources() {
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            self?.loadScreenSources()
            self?.loadWindowSources()
            
            DispatchQueue.main.async {
                self?.collectionView.reloadData()
            }
        }
    }
    
    private func loadScreenSources() {
        var sources: [ScreenSource] = []
        
        for (index, screen) in NSScreen.screens.enumerated() {
            let displayID = screen.deviceDescription[NSDeviceDescriptionKey("NSScreenNumber")] as? CGDirectDisplayID ?? 0
            let name = index == 0 ? "Entire Screen" : "Screen \(index + 1)"
            
            // Capture thumbnail
            var thumbnail: NSImage?
            if let cgImage = CGDisplayCreateImage(displayID) {
                thumbnail = NSImage(cgImage: cgImage, size: NSSize(width: 200, height: 150))
            }
            
            sources.append(ScreenSource(
                id: "\(displayID)",
                name: name,
                type: "screen",
                thumbnail: thumbnail,
                displayId: displayID,
                windowId: nil
            ))
        }
        
        screenSources = sources
    }
    
    private func loadWindowSources() {
        var sources: [ScreenSource] = []
        
        let options: CGWindowListOption = [.optionOnScreenOnly, .excludeDesktopElements]
        guard let windowList = CGWindowListCopyWindowInfo(options, kCGNullWindowID) as? [[String: Any]] else {
            print("QuickRTC: Failed to get window list")
            windowSources = sources
            return
        }
        
        let currentPID = ProcessInfo.processInfo.processIdentifier
        print("QuickRTC: Found \(windowList.count) windows, current PID: \(currentPID)")
        
        for window in windowList {
            guard let windowID = window[kCGWindowNumber as String] as? CGWindowID,
                  let ownerPID = window[kCGWindowOwnerPID as String] as? Int32,
                  let ownerName = window[kCGWindowOwnerName as String] as? String,
                  ownerPID != currentPID else {
                continue
            }
            
            let windowName = window[kCGWindowName as String] as? String ?? ""
            let layer = window[kCGWindowLayer as String] as? Int ?? 0
            
            // Skip system windows, menu bars, and windows without names
            if layer < 0 || layer > 100 {
                continue
            }
            
            // Skip windows that are too small (likely not real windows)
            if let bounds = window[kCGWindowBounds as String] as? [String: CGFloat],
               let width = bounds["Width"], let height = bounds["Height"],
               width < 100 || height < 100 {
                continue
            }
            
            let displayName = windowName.isEmpty ? ownerName : "\(ownerName): \(windowName)"
            
            // Capture window thumbnail with better quality
            var thumbnail: NSImage?
            
            // Try to capture the actual window image
            if let cgImage = CGWindowListCreateImage(
                .null,
                .optionIncludingWindow,
                windowID,
                [.boundsIgnoreFraming, .bestResolution]
            ) {
                let imageSize = NSSize(width: CGFloat(cgImage.width), height: CGFloat(cgImage.height))
                thumbnail = NSImage(cgImage: cgImage, size: imageSize)
                print("QuickRTC: Captured thumbnail for '\(displayName)' size: \(imageSize)")
            } else {
                print("QuickRTC: Failed to capture thumbnail for '\(displayName)', trying app icon")
                // Fallback: try to get the app icon
                if let app = NSRunningApplication(processIdentifier: ownerPID) {
                    thumbnail = app.icon
                }
            }
            
            // If still no thumbnail, use a placeholder
            if thumbnail == nil {
                thumbnail = NSImage(named: NSImage.applicationIconName)
            }
            
            sources.append(ScreenSource(
                id: "\(windowID)",
                name: displayName,
                type: "window",
                thumbnail: thumbnail,
                displayId: nil,
                windowId: windowID
            ))
        }
        
        print("QuickRTC: Loaded \(sources.count) window sources")
        windowSources = sources
    }
    
    @objc private func tabChanged(_ sender: NSSegmentedControl) {
        currentTab = sender.selectedSegment
        selectedSource = nil
        shareButton.isEnabled = false
        collectionView.reloadData()
    }
    
    @objc private func cancelClicked(_ sender: NSButton) {
        onCancel?()
    }
    
    @objc private func shareClicked(_ sender: NSButton) {
        guard let source = selectedSource else { return }
        
        var sourceInfo: [String: Any] = [
            "id": source.id,
            "name": source.name,
            "type": source.type
        ]
        
        if let displayId = source.displayId {
            sourceInfo["displayId"] = displayId
        }
        if let windowId = source.windowId {
            sourceInfo["windowId"] = windowId
        }
        
        onSourceSelected?(sourceInfo)
    }
    
    private func currentSources() -> [ScreenSource] {
        return currentTab == 0 ? screenSources : windowSources
    }
}

// MARK: - NSCollectionViewDelegate & DataSource
@available(macOS 10.14, *)
extension ScreenPickerView: NSCollectionViewDelegate, NSCollectionViewDataSource {
    func collectionView(_ collectionView: NSCollectionView, numberOfItemsInSection section: Int) -> Int {
        return currentSources().count
    }
    
    func collectionView(_ collectionView: NSCollectionView, itemForRepresentedObjectAt indexPath: IndexPath) -> NSCollectionViewItem {
        let item = collectionView.makeItem(withIdentifier: NSUserInterfaceItemIdentifier("ScreenSourceItem"), for: indexPath) as! ScreenSourceItem
        let source = currentSources()[indexPath.item]
        item.configure(with: source)
        return item
    }
    
    func collectionView(_ collectionView: NSCollectionView, didSelectItemsAt indexPaths: Set<IndexPath>) {
        if let indexPath = indexPaths.first {
            selectedSource = currentSources()[indexPath.item]
            shareButton.isEnabled = true
        }
    }
    
    func collectionView(_ collectionView: NSCollectionView, didDeselectItemsAt indexPaths: Set<IndexPath>) {
        if collectionView.selectionIndexPaths.isEmpty {
            selectedSource = nil
            shareButton.isEnabled = false
        }
    }
}

// MARK: - Screen Source Item (Collection View Item)
@available(macOS 10.14, *)
class ScreenSourceItem: NSCollectionViewItem {
    private var thumbnailView: NSImageView!
    private var titleLabel: NSTextField!
    private var containerView: NSView!
    
    override func loadView() {
        view = NSView(frame: NSRect(x: 0, y: 0, width: 220, height: 180))
        
        containerView = NSView()
        containerView.wantsLayer = true
        containerView.layer?.cornerRadius = 8
        containerView.layer?.borderWidth = 2
        containerView.layer?.borderColor = NSColor.clear.cgColor
        containerView.layer?.backgroundColor = NSColor.controlBackgroundColor.cgColor
        containerView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(containerView)
        
        thumbnailView = NSImageView()
        thumbnailView.imageScaling = .scaleProportionallyUpOrDown
        thumbnailView.imageAlignment = .alignCenter
        thumbnailView.wantsLayer = true
        thumbnailView.layer?.cornerRadius = 4
        thumbnailView.layer?.masksToBounds = true
        thumbnailView.layer?.backgroundColor = NSColor.black.withAlphaComponent(0.1).cgColor
        thumbnailView.translatesAutoresizingMaskIntoConstraints = false
        containerView.addSubview(thumbnailView)
        
        titleLabel = NSTextField(labelWithString: "")
        titleLabel.font = NSFont.systemFont(ofSize: 11, weight: .medium)
        titleLabel.alignment = .center
        titleLabel.lineBreakMode = .byTruncatingMiddle
        titleLabel.maximumNumberOfLines = 2
        titleLabel.textColor = NSColor.labelColor
        titleLabel.translatesAutoresizingMaskIntoConstraints = false
        containerView.addSubview(titleLabel)
        
        NSLayoutConstraint.activate([
            containerView.topAnchor.constraint(equalTo: view.topAnchor),
            containerView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            containerView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            containerView.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            
            thumbnailView.topAnchor.constraint(equalTo: containerView.topAnchor, constant: 8),
            thumbnailView.leadingAnchor.constraint(equalTo: containerView.leadingAnchor, constant: 8),
            thumbnailView.trailingAnchor.constraint(equalTo: containerView.trailingAnchor, constant: -8),
            thumbnailView.heightAnchor.constraint(equalToConstant: 125),
            
            titleLabel.topAnchor.constraint(equalTo: thumbnailView.bottomAnchor, constant: 6),
            titleLabel.leadingAnchor.constraint(equalTo: containerView.leadingAnchor, constant: 5),
            titleLabel.trailingAnchor.constraint(equalTo: containerView.trailingAnchor, constant: -5),
            titleLabel.bottomAnchor.constraint(lessThanOrEqualTo: containerView.bottomAnchor, constant: -6),
        ])
    }
    
    func configure(with source: ScreenPickerView.ScreenSource) {
        if let thumbnail = source.thumbnail {
            thumbnailView.image = thumbnail
        } else {
            // Use a default icon based on type
            if source.type == "screen" {
                thumbnailView.image = NSImage(named: NSImage.computerName)
            } else {
                thumbnailView.image = NSImage(named: NSImage.applicationIconName)
            }
        }
        titleLabel.stringValue = source.name
    }
    
    override var isSelected: Bool {
        didSet {
            if isSelected {
                containerView.layer?.borderColor = NSColor.systemBlue.cgColor
                containerView.layer?.backgroundColor = NSColor.selectedContentBackgroundColor.cgColor
            } else {
                containerView.layer?.borderColor = NSColor.clear.cgColor
                containerView.layer?.backgroundColor = NSColor.controlBackgroundColor.cgColor
            }
        }
    }
    
    override func prepareForReuse() {
        super.prepareForReuse()
        thumbnailView.image = nil
        titleLabel.stringValue = ""
        isSelected = false
    }
}
