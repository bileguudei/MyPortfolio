// Cuts the person out of the portrait photo, on this machine.
//
//   swift scripts/segment-portrait.swift <photo> <mask.png>
//
// Uses Apple's Vision person segmentation (macOS 12+), so the photo never
// leaves the computer. Writes an 8-bit greyscale mask the size of the photo:
// white = person, black = background. prepare-portrait.mjs calls this when
// assets/portrait/mask.png is missing; on other systems, supply the mask
// yourself or the script falls back to the plain photo.

import Foundation
import Vision
import CoreImage
import ImageIO
import UniformTypeIdentifiers

let args = CommandLine.arguments
let input = URL(fileURLWithPath: args[1]), output = URL(fileURLWithPath: args[2])
guard let src = CGImageSourceCreateWithURL(input as CFURL, nil),
      let image = CGImageSourceCreateImageAtIndex(src, 0, nil) else { fatalError("read") }
let request = VNGeneratePersonSegmentationRequest()
request.qualityLevel = .accurate
request.outputPixelFormat = kCVPixelFormatType_OneComponent8
try VNImageRequestHandler(cgImage: image).perform([request])
guard let buffer = request.results?.first?.pixelBuffer else { fatalError("no person") }
var mask = CIImage(cvPixelBuffer: buffer)
mask = mask.transformed(by: CGAffineTransform(scaleX: CGFloat(image.width) / mask.extent.width,
                                               y: CGFloat(image.height) / mask.extent.height))
let ctx = CIContext()
guard let out = ctx.createCGImage(mask, from: CGRect(x: 0, y: 0, width: image.width, height: image.height),
                                  format: .L8, colorSpace: CGColorSpaceCreateDeviceGray()),
      let dest = CGImageDestinationCreateWithURL(output as CFURL, UTType.png.identifier as CFString, 1, nil) else { fatalError("write") }
CGImageDestinationAddImage(dest, out, nil)
CGImageDestinationFinalize(dest)
print("mask \(image.width)x\(image.height)")
