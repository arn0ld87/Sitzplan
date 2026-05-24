// swift-tools-version: 5.10

import PackageDescription

let package = Package(
    name: "SitzplanMac",
    platforms: [
        .macOS(.v13)
    ],
    products: [
        .executable(name: "SitzplanMac", targets: ["SitzplanMac"])
    ],
    targets: [
        .executableTarget(
            name: "SitzplanMac"
        )
    ]
)
