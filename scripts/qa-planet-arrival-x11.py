#!/usr/bin/env python3
"""Persistent, read-only X11 acquisition for the native Spatial QA recipe.

JSONL: {id, op: setup|calibrate|capture|export|close, ...}.
Only export and failed-calibration diagnostics encode/hash/write pixels.
Importing this module never opens X11.
A capture is ONE full viewport XGetImage, even when its nonce is rejected.
See the caller for native before/after gates and the opaque CDP preflight.
"""

import ctypes as C
import ctypes.util
import hashlib
import json
import os
from pathlib import Path
import re
import struct
import sys
import time
import zlib

SCHEMA = 1
SCREEN = (1920, 1200, 24)
MAX_RAW_BYTES = 1920 * 1200 * 4
REQUIRED_BROWSER_FLAGS = (
    "--ozone-platform=x11", "--disable-gpu", "--disable-gpu-compositing", "--no-xshm"
)
ALPHA_POLICY = {"value": 255, "nativeAlpha": False,
                "basis": "opaque CDP preflight required", "verifiedByHelper": False}


class GuardError(Exception):
    def __init__(self, message, details=None, result=None):
        super().__init__(message)
        self.details = details
        self.result = result


def require(condition, message, details=None):
    if not condition:
        raise GuardError(message, details)


def integer(value, name, minimum=0, maximum=2**31 - 1):
    require(type(value) is int and minimum <= value <= maximum,
            f"Invalid integer {name}")
    return value


def milliseconds(start, end):
    return (end - start) / 1_000_000


def channel_offsets(fmt):
    require(fmt["depth"] == 24 and fmt["bitsPerPixel"] == 32,
            "Only observed 24-depth / 32-bpp native pixels are supported")
    require(fmt["xOffset"] == 0 and fmt["format"] == "ZPixmap",
            "Unsupported native image offset or format")
    require(fmt["byteOrderCode"] in (0, 1), "Invalid XImage byte order")
    require(fmt["bitmapPad"] == 32 and fmt["bitmapUnit"] == 32,
            "Unexpected native bitmap unit/padding")
    require(fmt["bytesPerLine"] >= fmt["width"] * 4
            and fmt["bytesPerLine"] % 4 == 0, "Invalid native row stride")
    masks = [fmt[k] for k in ("redMask", "greenMask", "blueMask")]
    offsets = []
    for mask in masks:
        require(mask in (0xFF, 0xFF00, 0xFF0000),
                "RGB mask is not an exact byte channel", masks)
        shift = (mask.bit_length() - 8) // 8
        offsets.append(shift if fmt["byteOrderCode"] == 0 else 3 - shift)
    require(len(set(offsets)) == 3, "Overlapping native RGB masks")
    return offsets


def validate_raw(raw, fmt):
    channel_offsets(fmt)
    require(0 < fmt["width"] <= SCREEN[0] and 0 < fmt["height"] <= SCREEN[1],
            "Native image dimensions exceed the screen")
    require(len(raw) == fmt["bytesPerLine"] * fmt["height"] <= MAX_RAW_BYTES,
            "Native bytes do not match stride times height")


def native_to_rgba(raw, fmt):
    """Byte permutation only; the unused native byte is preserved in .raw."""
    validate_raw(raw, fmt)
    offsets = channel_offsets(fmt)
    w, h, stride = fmt["width"], fmt["height"], fmt["bytesPerLine"]
    out = bytearray(w * h * 4)
    out[3::4] = b"\xff" * (w * h)
    for y in range(h):
        a = y * stride
        b = y * w * 4
        for channel, offset in enumerate(offsets):
            out[b + channel:b + w * 4:4] = raw[a + offset:a + w * 4:4]
    return bytes(out)


def marker_pixels(raw, fmt, marker):
    offsets = channel_offsets(fmt)
    x, y, w, h = (marker[k] for k in ("x", "y", "width", "height"))
    require(x >= 0 and y >= 0 and x + w <= fmt["width"]
            and y + h <= fmt["height"], "Marker exceeds native image")
    return [raw[(y + yy) * fmt["bytesPerLine"] + (x + xx) * 4 + channel]
            for yy in range(h) for xx in range(w) for channel in offsets]


def validate_markers(viewport, markers):
    w = integer(viewport.get("width"), "viewport.width", 8, SCREEN[0])
    h = integer(viewport.get("height"), "viewport.height", 16, SCREEN[1])
    require(isinstance(markers, list) and len(markers) == 4,
            "Exactly four corner markers are required")
    expected = {(0, 0), (w - 4, 0), (0, h - 8), (w - 4, h - 8)}
    actual, ids, result = set(), set(), []
    for item in markers:
        require(isinstance(item, dict), "Invalid marker")
        ident = item.get("id")
        require(isinstance(ident, str) and 0 < len(ident) <= 64 and ident not in ids,
                "Marker ids must be unique")
        x, y = integer(item.get("x"), "marker.x"), integer(item.get("y"), "marker.y")
        require(item.get("width") == 4 and item.get("height") == 8,
                "Markers must be 4 by 8 native pixels")
        rgb = item.get("rgb")
        require(isinstance(rgb, list) and len(rgb) == 96
                and all(type(v) is int and 0 <= v <= 255 for v in rgb),
                "Each marker must supply exactly 96 RGB bytes")
        actual.add((x, y)); ids.add(ident)
        result.append({"id": ident, "x": x, "y": y, "width": 4, "height": 8,
                       "rgb": list(rgb)})
    require(actual == expected, "Markers must occupy all four viewport corners")
    require(len({tuple(m["rgb"]) for m in result}) == 4,
            "Corner marker patterns must differ")
    return {"width": w, "height": h}, result


def validate_nonce(nonce):
    require(isinstance(nonce, str) and re.fullmatch(r"[0-9a-f]{24}", nonce),
            "Nonce must be 24 lower-case hexadecimal characters")
    return nonce


def marker_layout(markers):
    return sorted((m["id"], m["x"], m["y"], m["width"], m["height"]) for m in markers)


def find_marker(rgba, width, height, marker):
    """Calibration only: require one exact full marker in one native image."""
    rgb = marker["rgb"]
    pattern = bytes(v for i in range(32) for v in (*rgb[i * 3:i * 3 + 3], 255))
    first = pattern[:16]
    found, cursor = [], 0
    while True:
        at = rgba.find(first, cursor)
        if at < 0:
            return found
        cursor = at + 1
        if at % 4:
            continue
        y, x = divmod(at // 4, width)
        if x + 4 > width or y + 8 > height:
            continue
        if all(rgba[((y + row) * width + x) * 4:
                    ((y + row) * width + x + 4) * 4] == pattern[row * 16:(row + 1) * 16]
               for row in range(8)):
            found.append({"x": x, "y": y})
            if len(found) > 1:
                return found


def png_chunk(name, data):
    return (struct.pack(">I", len(data)) + name + data
            + struct.pack(">I", zlib.crc32(name + data) & 0xFFFFFFFF))


def encode_png(rgba, width, height):
    require(len(rgba) == width * height * 4, "RGBA length mismatch")
    scanlines = b"".join(b"\0" + rgba[y * width * 4:(y + 1) * width * 4]
                         for y in range(height))
    return (b"\x89PNG\r\n\x1a\n"
            + png_chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0))
            + png_chunk(b"IDAT", zlib.compress(scanlines, 6)) + png_chunk(b"IEND", b""))


def decode_own_png(png, width, height):
    """Strict round trip of the lossless RGBA/filter-0 encoder, after capture."""
    require(png[:8] == b"\x89PNG\r\n\x1a\n", "Invalid PNG signature")
    cursor, compressed, tags = 8, bytearray(), []
    while cursor < len(png):
        require(cursor + 12 <= len(png), "Truncated PNG chunk")
        size = struct.unpack_from(">I", png, cursor)[0]
        require(cursor + 12 + size <= len(png), "Truncated PNG data")
        name = png[cursor + 4:cursor + 8]
        data = png[cursor + 8:cursor + 8 + size]
        crc = struct.unpack_from(">I", png, cursor + 8 + size)[0]
        require(crc == zlib.crc32(name + data) & 0xFFFFFFFF, "PNG CRC mismatch")
        tags.append(name)
        if name == b"IHDR":
            require(data == struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0),
                    "PNG format changed")
        elif name == b"IDAT":
            compressed.extend(data)
        elif name == b"IEND":
            require(size == 0, "Invalid PNG end")
        else:
            raise GuardError("Unexpected PNG chunk")
        cursor += size + 12
    require(tags == [b"IHDR", b"IDAT", b"IEND"], "Unexpected PNG chunk order")
    scanlines = zlib.decompress(compressed)
    stride = width * 4 + 1
    require(len(scanlines) == stride * height and
            all(scanlines[y * stride] == 0 for y in range(height)),
            "PNG scanlines changed")
    return b"".join(scanlines[y * stride + 1:(y + 1) * stride] for y in range(height))


class Visual(C.Structure):
    _fields_ = [("ext_data", C.c_void_p), ("visualid", C.c_ulong),
                ("visual_class", C.c_int), ("red_mask", C.c_ulong),
                ("green_mask", C.c_ulong), ("blue_mask", C.c_ulong),
                ("bits_per_rgb", C.c_int), ("map_entries", C.c_int)]


class XWindowAttributes(C.Structure):
    _fields_ = [("x", C.c_int), ("y", C.c_int), ("width", C.c_int),
                ("height", C.c_int), ("border_width", C.c_int), ("depth", C.c_int),
                ("visual", C.POINTER(Visual)), ("root", C.c_ulong),
                ("window_class", C.c_int), ("bit_gravity", C.c_int),
                ("win_gravity", C.c_int), ("backing_store", C.c_int),
                ("backing_planes", C.c_ulong), ("backing_pixel", C.c_ulong),
                ("save_under", C.c_int), ("colormap", C.c_ulong),
                ("map_installed", C.c_int), ("map_state", C.c_int),
                ("all_event_masks", C.c_long), ("your_event_mask", C.c_long),
                ("do_not_propagate_mask", C.c_long), ("override_redirect", C.c_int),
                ("screen", C.c_void_p)]


class XImageFunctions(C.Structure):
    _fields_ = [(name, C.c_void_p) for name in
                ("create_image", "destroy_image", "get_pixel", "put_pixel", "sub_image", "add_pixel")]


class XImage(C.Structure):
    _fields_ = [("width", C.c_int), ("height", C.c_int), ("xoffset", C.c_int),
                ("format", C.c_int), ("data", C.c_void_p), ("byte_order", C.c_int),
                ("bitmap_unit", C.c_int), ("bitmap_bit_order", C.c_int),
                ("bitmap_pad", C.c_int), ("depth", C.c_int),
                ("bytes_per_line", C.c_int), ("bits_per_pixel", C.c_int),
                ("red_mask", C.c_ulong), ("green_mask", C.c_ulong),
                ("blue_mask", C.c_ulong), ("obdata", C.c_void_p),
                ("f", XImageFunctions)]


class XErrorEvent(C.Structure):
    _fields_ = [("type", C.c_int), ("display", C.c_void_p),
                ("resourceid", C.c_ulong), ("serial", C.c_ulong),
                ("error_code", C.c_ubyte), ("request_code", C.c_ubyte),
                ("minor_code", C.c_ubyte)]


class XPixmapFormat(C.Structure):
    _fields_ = [("depth", C.c_int), ("bits_per_pixel", C.c_int), ("scanline_pad", C.c_int)]


def abi_layout():
    return {"pointerBytes": C.sizeof(C.c_void_p), "longBytes": C.sizeof(C.c_long),
            "XImageBytes": C.sizeof(XImage), "XImageDataOffset": XImage.data.offset,
            "XImageStrideOffset": XImage.bytes_per_line.offset,
            "XImageMasksOffset": XImage.red_mask.offset,
            "XImageFunctionsOffset": XImage.f.offset,
            "XWindowAttributesBytes": C.sizeof(XWindowAttributes),
            "VisualBytes": C.sizeof(Visual), "XErrorEventBytes": C.sizeof(XErrorEvent)}


def check_abi():
    observed = abi_layout()
    require(observed == {"pointerBytes": 8, "longBytes": 8, "XImageBytes": 136,
                         "XImageDataOffset": 16, "XImageStrideOffset": 44,
                         "XImageMasksOffset": 56, "XImageFunctionsOffset": 88,
                         "XWindowAttributesBytes": 136, "VisualBytes": 56,
                         "XErrorEventBytes": 40}, "Unsupported Xlib ABI", observed)
    require(sys.platform == "linux", "This helper requires Linux LP64")
    return observed


class X11:
    def __init__(self, display_name):
        check_abi()
        self.lib = C.CDLL(ctypes.util.find_library("X11") or "libX11.so.6")
        self.display, self.errors, self.atoms = None, [], {}
        D, U, I, P = C.c_void_p, C.c_ulong, C.c_int, C.POINTER
        functions = {
            "XOpenDisplay": ([C.c_char_p], D), "XCloseDisplay": ([D], I),
            "XDefaultScreen": ([D], I), "XScreenCount": ([D], I),
            "XRootWindow": ([D, I], U), "XDisplayWidth": ([D, I], I),
            "XDisplayHeight": ([D, I], I), "XDefaultDepth": ([D, I], I),
            "XServerVendor": ([D], C.c_char_p), "XVendorRelease": ([D], I),
            "XProtocolVersion": ([D], I), "XProtocolRevision": ([D], I),
            "XMaxRequestSize": ([D], C.c_long), "XExtendedMaxRequestSize": ([D], C.c_long),
            "XGetWindowAttributes": ([D, U, P(XWindowAttributes)], I),
            "XTranslateCoordinates": ([D, U, U, I, I, P(I), P(I), P(U)], I),
            "XQueryTree": ([D, U, P(U), P(U), P(P(U)), P(C.c_uint)], I),
            "XInternAtom": ([D, C.c_char_p, I], U),
            "XGetSelectionOwner": ([D, U], U),
            "XGetWindowProperty": ([D, U, U, C.c_long, C.c_long, I, U,
                                    P(U), P(I), P(U), P(U), P(P(C.c_ubyte))], I),
            "XListPixmapFormats": ([D, P(I)], P(XPixmapFormat)),
            "XGetImage": ([D, U, I, I, C.c_uint, C.c_uint, U, I], P(XImage)),
            "XDestroyImage": ([P(XImage)], I), "XFree": ([D], I),
            "XSetErrorHandler": ([D], D),
        }
        for name, (args, result) in functions.items():
            fn = getattr(self.lib, name); fn.argtypes = args; fn.restype = result
        callback_type = C.CFUNCTYPE(I, D, P(XErrorEvent))
        def on_error(_display, event):
            e = event.contents
            self.errors.append({"code": e.error_code, "request": e.request_code,
                                "minor": e.minor_code, "resource": e.resourceid,
                                "serial": e.serial})
            return 0
        self.error_callback = callback_type(on_error)
        self.old_error_handler = self.lib.XSetErrorHandler(C.cast(self.error_callback, D))
        self.display = self.lib.XOpenDisplay(display_name.encode())
        if not self.display:
            self.lib.XSetErrorHandler(self.old_error_handler)
            raise GuardError("XOpenDisplay failed")
        self.screen = self.lib.XDefaultScreen(self.display)
        self.root = int(self.lib.XRootWindow(self.display, self.screen))

    def check(self):
        if self.errors:
            errors, self.errors = self.errors, []
            raise GuardError("X11 request failed", errors)

    def atom(self, name):
        if name in self.atoms:
            return self.atoms[name]
        atom = int(self.lib.XInternAtom(self.display, name.encode(), 1))
        self.check()
        # A property/selection atom absent during setup may appear later.
        if atom:
            self.atoms[name] = atom
        return atom

    def property(self, window, name):
        atom = self.atom(name)
        if not atom:
            return None
        actual, fmt, count, rest = C.c_ulong(), C.c_int(), C.c_ulong(), C.c_ulong()
        data = C.POINTER(C.c_ubyte)()
        status = self.lib.XGetWindowProperty(self.display, window, atom, 0, 1024, 0, 0,
                                            C.byref(actual), C.byref(fmt), C.byref(count),
                                            C.byref(rest), C.byref(data))
        try:
            self.check(); require(status == 0 and rest.value == 0, "Invalid X11 property")
            if actual.value == 0:
                return None
            require(fmt.value in (8, 16, 32), "Invalid X11 property format")
            typ = {8: C.c_ubyte, 16: C.c_ushort, 32: C.c_ulong}[fmt.value]
            values = list(C.cast(data, C.POINTER(typ))[:count.value])
            return {"type": actual.value, "format": fmt.value, "values": values}
        finally:
            if data:
                self.lib.XFree(data)

    def pid(self, window):
        prop = self.property(window, "_NET_WM_PID")
        if prop is None:
            return None
        require(prop["type"] == 6 and prop["format"] == 32 and len(prop["values"]) == 1,
                "Invalid _NET_WM_PID")
        return prop["values"][0]

    def attributes(self, window):
        a = XWindowAttributes()
        status = self.lib.XGetWindowAttributes(self.display, window, C.byref(a))
        self.check(); require(status != 0, "Cannot read window attributes")
        require(bool(a.visual) or a.window_class == 2,
                "InputOutput window has no visual")
        x, y, child = C.c_int(), C.c_int(), C.c_ulong()
        status = self.lib.XTranslateCoordinates(self.display, window, self.root, 0, 0,
                                               C.byref(x), C.byref(y), C.byref(child))
        self.check(); require(status != 0, "Cannot translate window coordinates")
        v = a.visual.contents if a.visual else None
        return {"id": int(window), "root": int(a.root), "rootBounds": {
                    "x": x.value, "y": y.value, "width": a.width, "height": a.height},
                "depth": a.depth, "borderWidth": a.border_width,
                "mapState": a.map_state, "windowClass": a.window_class,
                "visualId": int(v.visualid) if v else None,
                "visualClass": v.visual_class if v else None,
                "redMask": int(v.red_mask) if v else None,
                "greenMask": int(v.green_mask) if v else None,
                "blueMask": int(v.blue_mask) if v else None,
                "overrideRedirect": bool(a.override_redirect)}

    def tree(self, window):
        root, parent, count, children = C.c_ulong(), C.c_ulong(), C.c_uint(), C.POINTER(C.c_ulong)()
        status = self.lib.XQueryTree(self.display, window, C.byref(root), C.byref(parent),
                                    C.byref(children), C.byref(count))
        try:
            self.check(); require(status != 0 and count.value <= 4096, "Cannot read window tree")
            return int(parent.value), list(children[:count.value]) if children else []
        finally:
            if children:
                self.lib.XFree(children)

    def compositor_owner(self):
        atom = self.atom(f"_NET_WM_CM_S{self.screen}")
        owner = int(self.lib.XGetSelectionOwner(self.display, atom)) if atom else 0
        self.check()
        return owner

    def image(self, x, y, width, height):
        require(x >= 0 and y >= 0 and width > 0 and height > 0
                and x + width <= SCREEN[0] and y + height <= SCREEN[1],
                "XGetImage rectangle is outside screen")
        start = time.monotonic_ns()
        image = self.lib.XGetImage(self.display, self.root, x, y, width, height,
                                   C.c_ulong(-1).value, 2)
        acquired = time.monotonic_ns()
        try:
            self.check(); require(bool(image), "XGetImage returned no image")
            i = image.contents
            fmt = {"width": i.width, "height": i.height, "depth": i.depth,
                   "bitsPerPixel": i.bits_per_pixel, "bytesPerLine": i.bytes_per_line,
                   "byteOrder": "LSBFirst" if i.byte_order == 0 else "MSBFirst",
                   "byteOrderCode": i.byte_order, "bitmapUnit": i.bitmap_unit,
                   "bitmapPad": i.bitmap_pad, "xOffset": i.xoffset,
                   "redMask": int(i.red_mask), "greenMask": int(i.green_mask),
                   "blueMask": int(i.blue_mask), "format": "ZPixmap" if i.format == 2 else str(i.format)}
            channel_offsets(fmt)
            require(i.width == width and i.height == height and i.data,
                    "XGetImage returned unexpected dimensions or no data")
            length = i.bytes_per_line * height
            require(0 < length <= MAX_RAW_BYTES, "XImage byte count is invalid")
            raw = C.string_at(i.data, length)
            copied = time.monotonic_ns()
            validate_raw(raw, fmt)
            return raw, fmt, {"getImageStartMonotonicNs": str(start),
                              "getImageEndMonotonicNs": str(acquired),
                              "privateCopyEndMonotonicNs": str(copied),
                              "getImageMs": milliseconds(start, acquired),
                              "privateCopyMs": milliseconds(acquired, copied),
                              "copyMs": milliseconds(start, copied)}
        finally:
            if image:
                self.lib.XDestroyImage(image)

    def close(self):
        if self.display:
            self.lib.XCloseDisplay(self.display)
            self.display = None
        self.lib.XSetErrorHandler(self.old_error_handler)


def intersects(a, b):
    return (a["x"] < b["x"] + b["width"] and b["x"] < a["x"] + a["width"]
            and a["y"] < b["y"] + b["height"] and b["y"] < a["y"] + a["height"])


def contains(outer, inner):
    return (outer["x"] <= inner["x"] and outer["y"] <= inner["y"]
            and outer["x"] + outer["width"] >= inner["x"] + inner["width"]
            and outer["y"] + outer["height"] >= inner["y"] + inner["height"])


def presenter_surface_bound(width, height, pixmap_format, capacity_bytes):
    """Bound the real native drawable, including browser UI, not just the ROI."""
    width = integer(width, "native window width", 1, 65535)
    height = integer(height, "native window height", 1, 65535)
    maximum_area = SCREEN[0] * SCREEN[1] * 4
    require(width * height <= maximum_area, "Native window surface area is excessive")
    require(pixmap_format["bitsPerPixel"] == 32 and pixmap_format["scanlinePad"] == 32,
            "Unexpected native presenter pixmap format")
    row_bytes = ((width * 32 + 31) // 32) * 4
    required_bytes = row_bytes * height + 32
    proof = {"width": width, "height": height, "bitsPerPixel": 32,
             "scanlinePad": 32, "rowBytes": row_bytes,
             "requiredBytes": required_bytes, "capacityBytes": capacity_bytes,
             "maximumAreaPixels": maximum_area}
    require(required_bytes <= capacity_bytes,
            "BIG-REQUESTS cannot hold the actual native window surface", proof)
    return {"passed": True, **proof}


def process_info(pid):
    pid = integer(pid, "pid", 1)
    cmdline = (Path("/proc") / str(pid) / "cmdline").read_bytes().split(b"\0")
    argv = [s.decode("utf-8", "replace") for s in cmdline if s]
    require(bool(argv), "Process has no command line")
    return {"pid": pid, "argv": argv, "executable": str((Path("/proc") / str(pid) / "exe").resolve())}


class Helper:
    def __init__(self):
        self.x = None
        self.runtime = None
        self.calibrations, self.frames, self.exported = {}, {}, {}
        self.nonces, self.patterns, self.capture_ids = set(), set(), set()
        self.closed = False

    def setup(self, req):
        require(self.x is None, "Setup may only run once")
        display = req.get("display") or os.environ.get("DISPLAY", "")
        match = re.fullmatch(r":([0-9]+)(?:\.0)?", display)
        require(bool(match), "A local screen-zero Xvfb DISPLAY is required")
        browser_pid = integer(req.get("browserPid"), "browserPid", 1)
        browser = process_info(browser_pid)
        require(all(flag in browser["argv"] for flag in REQUIRED_BROWSER_FLAGS),
                "Browser command line does not select the reviewed X11 software path")
        server_pid = int(Path(f"/tmp/.X{match.group(1)}-lock").read_text().strip())
        server = process_info(server_pid)
        argv = server["argv"]
        require(Path(server["executable"]).name == "Xvfb" and f":{int(match.group(1))}" in argv,
                "DISPLAY lock does not identify the expected Xvfb")
        require("-shmem" not in argv and "-fbdir" not in argv,
                "Xvfb framebuffer must be private malloc memory")
        require(any(argv[i:i + 3] == ["-screen", "0", "1920x1200x24"]
                    for i in range(len(argv) - 2)), "Unexpected Xvfb screen arguments")
        output = Path(req.get("outputDir", "")).resolve()
        require(bool(req.get("outputDir")), "outputDir is required")
        output.mkdir(parents=True, exist_ok=True)
        self.output, self.browser_pid = output, browser_pid
        self.x = X11(display)
        x = self.x
        observed = (x.lib.XDisplayWidth(x.display, x.screen),
                    x.lib.XDisplayHeight(x.display, x.screen),
                    x.lib.XDefaultDepth(x.display, x.screen))
        require(x.screen == 0 and x.lib.XScreenCount(x.display) == 1 and observed == SCREEN,
                "Unexpected X11 screen", observed)
        attrs = x.attributes(x.root)
        require(attrs["visualClass"] == 4 and attrs["depth"] == 24,
                "Root must use a 24-depth TrueColor visual")
        count = C.c_int(); formats = x.lib.XListPixmapFormats(x.display, C.byref(count))
        try:
            x.check(); require(bool(formats), "No pixmap formats")
            fmts = [{"depth": f.depth, "bitsPerPixel": f.bits_per_pixel,
                     "scanlinePad": f.scanline_pad} for f in formats[:count.value]]
        finally:
            if formats:
                x.lib.XFree(formats)
        matching = [f for f in fmts if f["depth"] == 24]
        require(matching == [{"depth": 24, "bitsPerPixel": 32, "scanlinePad": 32}],
                "Unexpected TrueColor pixmap format", matching)
        basic = int(x.lib.XMaxRequestSize(x.display))
        extended = int(x.lib.XExtendedMaxRequestSize(x.display))
        required = SCREEN[0] * 4 * SCREEN[1] + 32
        capacity = max(basic, extended) * 4
        require(extended > 0 and capacity >= required,
                "BIG-REQUESTS cannot hold the whole native surface", {"bytes": capacity, "required": required})
        owner = x.compositor_owner()
        require(owner == 0, "An X compositor owns the screen selection")
        _, native_format, _ = x.image(0, 0, 1, 1)
        require(all(native_format[k] == attrs[k] for k in ("redMask", "greenMask", "blueMask")),
                "Root visual and XImage masks differ")
        self.runtime = {"schema": SCHEMA, "setupId": "setup-000001",
                        "display": display, "screen": {"index": 0, "width": 1920,
                        "height": 1200, "depth": 24, "rootWindow": x.root},
                        "server": {**server, "vendor": x.lib.XServerVendor(x.display).decode(),
                        "vendorRelease": x.lib.XVendorRelease(x.display),
                        "protocolMajor": x.lib.XProtocolVersion(x.display),
                        "protocolMinor": x.lib.XProtocolRevision(x.display)},
                        "browser": browser, "python": {"executable": sys.executable, "version": sys.version},
                        "abi": check_abi(), "pixmapFormat": matching[0], "nativeFormat": native_format,
                        "capacity": {"basicUnits": basic, "extendedUnits": extended,
                        "bytes": capacity, "requiredBytes": required, "screenRowBytes": 7680,
                        "unitBytes": 4, "measuredConnection": "helper",
                        "chromiumInference": "same Xvfb global maximum; Chromium enables BIG-REQUESTS"},
                        "guards": {"passed": True, "privateFramebuffer": True,
                        "screenMatches": True, "trueColor": True, "bigRequestsSufficient": True,
                        "compositorSelectionOwner": owner, "browserFlagsPresent": True}}
        return self.runtime

    def browser_windows(self):
        result, pending, seen = [], [self.x.root], set()
        while pending:
            window = pending.pop()
            require(window not in seen and len(seen) < 4096, "Unexpected X11 window tree")
            seen.add(window)
            _, children = self.x.tree(window)
            for child in children:
                a = self.x.attributes(child)
                if a["mapState"] == 2 and a["windowClass"] == 1:
                    if self.x.pid(child) == self.browser_pid:
                        result.append({**a, "pid": self.browser_pid})
                    pending.append(child)
        return result

    def geometry_guard(self, calibration):
        x = self.x
        require(x.compositor_owner() == 0, "Compositor selection appeared")
        root = x.attributes(x.root)
        require(root["rootBounds"] == {"x": 0, "y": 0, "width": 1920, "height": 1200}
                and root["depth"] == 24 and root["visualClass"] == 4,
                "Root screen geometry or visual changed")
        require(all(root[k] == self.runtime["nativeFormat"][k]
                    for k in ("redMask", "greenMask", "blueMask")),
                "Root RGB masks changed")
        selected = x.attributes(calibration["window"]["id"])
        require(x.pid(selected["id"]) == self.browser_pid, "Browser window PID changed")
        original = calibration["window"]
        for key in ("rootBounds", "visualId", "depth", "visualClass", "mapState", "windowClass"):
            require(selected[key] == original[key], f"Window {key} changed")
        surface_bound = presenter_surface_bound(
            selected["rootBounds"]["width"], selected["rootBounds"]["height"],
            self.runtime["pixmapFormat"], self.runtime["capacity"]["bytes"])
        region = {**calibration["origin"], **calibration["viewport"]}
        require(contains(selected["rootBounds"], region), "Viewport left its browser window")
        require(contains({"x": 0, "y": 0, "width": 1920, "height": 1200}, region),
                "Viewport left the screen")
        chain, current, occluders = [], selected["id"], []
        while current != x.root:
            require(len(chain) < 32 and current not in chain, "Invalid window ancestry")
            chain.append(current)
            require(x.property(current, "CHROMIUM_COMPOSITE_WINDOW") is None,
                    "CHROMIUM_COMPOSITE_WINDOW must be absent")
            parent, _ = x.tree(current)
            require(parent != 0, "Window is detached")
            _, order = x.tree(parent)
            require(current in order, "Window missing from stacking order")
            for other in order[order.index(current) + 1:]:
                a = x.attributes(other)
                if a["mapState"] == 2 and a["windowClass"] == 1 and intersects(a["rootBounds"], region):
                    occluders.append(a)
            current = parent
        _, children = x.tree(selected["id"])
        for child in children:
            a = x.attributes(child)
            if a["mapState"] == 2 and a["windowClass"] == 1 and intersects(a["rootBounds"], region):
                occluders.append(a)
        require(not occluders, "Native window overlaps the viewport", occluders)
        return {"passed": True, "window": {**selected, "pid": self.browser_pid},
                "viewportRootBounds": region, "ancestorWindows": chain,
                "presenterSurfaceBound": surface_bound,
                "compositorSelectionOwner": 0, "chromiumCompositeWindowAbsent": True,
                "overlappingWindows": [], "noRecalibration": True}

    def calibration_failure(self, last, viewport, markers, nonce, start, deadline,
                            rounds, phase, error):
        """Preserve the existing last root copy; never acquire another image."""
        failed_at = time.monotonic_ns()
        basename = f"calibration-failure-{os.getpid()}-{start}"
        observation = {"afterLastImage": True,
                       "startedMonotonicNs": str(time.monotonic_ns()), "errors": []}
        # These are later observations, not simultaneous image metadata. An
        # absent/partial marker set must not hide the actual physical bounds.
        for key, read in (("root", lambda: self.x.attributes(self.x.root)),
                          ("browserWindows", self.browser_windows),
                          ("compositorSelectionOwner", self.x.compositor_owner)):
            read_start = time.monotonic_ns()
            try:
                observation[key] = read()
            except Exception as exc:
                observation["errors"].append({"field": key, "message": str(exc),
                                               "details": getattr(exc, "details", None)})
            observation[key + "Timing"] = {
                "startedMonotonicNs": str(read_start),
                "finishedMonotonicNs": str(time.monotonic_ns())}
        observation["finishedMonotonicNs"] = str(time.monotonic_ns())
        found = last.get("found")
        result = {"schema": SCHEMA, "kind": "native-x11-calibration-failure",
                  "diagnosticId": basename, "diagnosticOnly": True, "rejected": True,
                  "reason": str(error), "errorDetails": getattr(error, "details", None),
                  "failurePhase": phase, "setupId": self.runtime["setupId"],
                  "browserPid": self.browser_pid, "nonce": nonce,
                  "viewport": viewport, "sourceRect": {"x": 0, "y": 0,
                  "width": last["format"]["width"], "height": last["format"]["height"]},
                  "nativeFormat": last["format"], "expectedMarkers": markers,
                  "lastAcquisition": last["copyTiming"],
                  "matching": {"fullCalibrationImages": rounds,
                  "startedMonotonicNs": last.get("matchingStartMonotonicNs"),
                  "finishedMonotonicNs": last.get("matchingEndMonotonicNs"),
                  "foundByMarker": None if found is None else [
                      {"id": marker["id"], "matches": locations}
                      for marker, locations in zip(markers, found)]},
                  "timings": {"calibrationStartMonotonicNs": str(start),
                  "deadlineMonotonicNs": str(deadline), "failedMonotonicNs": str(failed_at),
                  "deadlineExceededAtFailure": failed_at >= deadline,
                  "elapsedAtFailureMs": milliseconds(start, failed_at)},
                  "windowObservation": observation, "files": {}, "preservationErrors": [],
                  "alphaPolicy": ALPHA_POLICY,
                  "scope": "Last already acquired root image only; not a calibrated viewport or accepted final capture"}

        def write_file(suffix, data):
            path = self.output / (basename + suffix)
            # Each failure has its own monotonic identifier. Never replace any
            # pre-existing evidence if a caller somehow repeats an identifier.
            with path.open("xb") as stream:
                stream.write(data)
            return {"path": str(path), "file": path.name, "bytes": len(data),
                    "sha256": hashlib.sha256(data).hexdigest()}

        write_start = time.monotonic_ns()
        try:
            result["files"]["raw"] = write_file(".raw", last["raw"])
            rgba, fmt = last.get("rgba"), last["format"]
            require(rgba is not None, "No completed RGBA conversion for the last calibration image")
            png = encode_png(rgba, fmt["width"], fmt["height"])
            decoded = decode_own_png(png, fmt["width"], fmt["height"])
            require(decoded == rgba, "Diagnostic PNG round trip changed native RGB values")
            result["files"]["png"] = write_file(".png", png)
            result["pixelEquality"] = {"matched": True, "rgbaBytes": len(rgba),
                "width": fmt["width"], "height": fmt["height"],
                "rgbaSha256": hashlib.sha256(rgba).hexdigest(),
                "pngDecodedRgbaSha256": hashlib.sha256(decoded).hexdigest(),
                "scope": "Native RGB permutation and PNG round trip only; no CDP calibration equality"}
        except Exception as exc:
            result["preservationErrors"].append({"phase": "raw-png", "message": str(exc),
                                                  "details": getattr(exc, "details", None)})
        result["timings"]["beforeMetadataWriteMs"] = milliseconds(write_start, time.monotonic_ns())
        try:
            result["files"]["metadata"] = write_file(
                ".json", (json.dumps(result, indent=2, ensure_ascii=False) + "\n").encode())
        except Exception as exc:
            result["preservationErrors"].append({"phase": "metadata", "message": str(exc),
                                                  "details": getattr(exc, "details", None)})
        return result

    def calibrate(self, req):
        require(self.runtime is not None, "Setup required")
        require(req.get("browserPid") == self.browser_pid, "Calibration browser PID changed")
        viewport, markers = validate_markers(req.get("viewport", {}), req.get("markers"))
        nonce = validate_nonce(req.get("nonce"))
        timeout = integer(req.get("timeoutMs", 5000), "timeoutMs", 1, 10000)
        start, rounds = time.monotonic_ns(), 0
        deadline = start + timeout * 1_000_000
        locations, last, phase = None, None, "acquire"
        try:
            while True:
                phase = "acquire"
                raw, fmt, copy_timing = self.x.image(0, 0, *SCREEN[:2]); rounds += 1
                last = {"raw": raw, "format": fmt, "copyTiming": copy_timing}
                phase = "matching"
                last["matchingStartMonotonicNs"] = str(time.monotonic_ns())
                rgba = native_to_rgba(raw, fmt); last["rgba"] = rgba
                found = [find_marker(rgba, *SCREEN[:2], m) for m in markers]
                last["found"] = found
                last["matchingEndMonotonicNs"] = str(time.monotonic_ns())
                require(all(len(f) <= 1 for f in found), "Calibration marker is not unique")
                if all(len(f) == 1 for f in found):
                    locations = [f[0] for f in found]
                    break
                require(time.monotonic_ns() < deadline, "Calibration markers did not appear")
                time.sleep(0.002)
            phase = "geometry"
            origins = {(p["x"] - m["x"], p["y"] - m["y"])
                       for p, m in zip(locations, markers)}
            require(len(origins) == 1, "Marker spacing is not exactly viewport scale 1")
            ox, oy = next(iter(origins)); origin = {"x": ox, "y": oy}
            region = {**origin, **viewport}
            candidates = [w for w in self.browser_windows() if contains(w["rootBounds"], region)]
            require(len(candidates) == 1, "Calibration does not identify one browser window", candidates)
            window = candidates[0]
            require(window["depth"] == 24 and window["visualClass"] == 4,
                    "Browser window is not 24-depth TrueColor")
            require(all(window[k] == fmt[k] for k in ("redMask", "greenMask", "blueMask")),
                    "Browser and root visual RGB masks differ")
            ident = f"calibration-{len(self.calibrations) + 1:06d}"
            cal = {"calibrationId": ident, "setupId": self.runtime["setupId"],
                   "viewport": viewport, "origin": origin, "window": window,
                   "format": fmt, "nonce": nonce, "markers": markers,
                   "markerLayout": [list(t) for t in marker_layout(markers)],
                   "markerLocations": locations}
            cal["guards"] = self.geometry_guard(cal)
            cal["timings"] = {"fullCalibrationImages": rounds,
                              "totalMs": milliseconds(start, time.monotonic_ns())}
            self.calibrations[ident] = cal
            return cal
        except Exception as exc:
            if last is None:
                raise
            failure = self.calibration_failure(last, viewport, markers, nonce, start,
                                               deadline, rounds, phase, exc)
            if isinstance(exc, GuardError):
                exc.result = {**(exc.result or {}), "calibrationFailure": failure}
                raise
            raise GuardError(str(exc), getattr(exc, "details", None),
                             {"calibrationFailure": failure}) from exc

    def capture(self, req):
        require(self.runtime is not None, "Setup required")
        ident = req.get("calibrationId"); require(ident in self.calibrations, "Unknown calibration")
        cal = self.calibrations[ident]
        nonce = validate_nonce(req.get("nonce"))
        _, markers = validate_markers(cal["viewport"], req.get("markers"))
        require(marker_layout(markers) == marker_layout(cal["markers"]), "Marker layout changed")
        pattern = tuple(tuple(m["rgb"]) for m in sorted(markers, key=lambda m: m["id"]))
        require(nonce not in self.nonces and pattern not in self.patterns,
                "Captured nonce or pixel pattern was reused")
        capture_id = req.get("captureId")
        require(isinstance(capture_id, str) and 0 < len(capture_id) <= 256
                and capture_id not in self.capture_ids, "Invalid or reused captureId")
        timeout = integer(req.get("timeoutMs"), "timeoutMs", 1, 10000)
        require(sum(len(f["raw"]) for f in self.frames.values()) + MAX_RAW_BYTES < 128 * 1024 * 1024,
                "Unexported native frames exceed the memory bound")
        self.nonces.add(nonce); self.patterns.add(pattern); self.capture_ids.add(capture_id)
        start = time.monotonic_ns(); deadline = start + timeout * 1_000_000
        before = self.geometry_guard(cal)
        probe_start = time.monotonic_ns(); probes, rounds, probe_ready = 0, 0, False
        probe_observations, probe_records = [], []
        while True:
            round_observations = []
            for m in markers:
                raw, fmt, probe_timing = self.x.image(cal["origin"]["x"] + m["x"],
                                                      cal["origin"]["y"] + m["y"], 4, 8)
                probes += 1
                observed = marker_pixels(raw, fmt, {**m, "x": 0, "y": 0})
                round_observations.append({"id": m["id"], "matched": observed == m["rgb"]})
                probe_records.append({"round": rounds + 1, "markerId": m["id"],
                                      "matched": observed == m["rgb"], **probe_timing})
            rounds += 1; probe_observations = round_observations
            probe_ready = all(m["matched"] for m in round_observations)
            if probe_ready or time.monotonic_ns() >= deadline:
                break
            time.sleep(min(0.002, max(0, (deadline - time.monotonic_ns()) / 1_000_000_000)))
        probe_end = time.monotonic_ns()
        # Exactly one full frame. No PNG, hash, complete RGB conversion or I/O here.
        raw, fmt, copy_timing = self.x.image(cal["origin"]["x"], cal["origin"]["y"],
                                            cal["viewport"]["width"], cal["viewport"]["height"])
        token = f"capture-{len(self.capture_ids):06d}"
        frame = {"raw": raw, "format": fmt, "calibration": cal,
                 "expectedMarkers": markers, "probes": probe_records,
                 "captureId": capture_id, "nonce": nonce}
        self.frames[token] = frame  # Preserve before any subsequent guard can fail.
        observations, errors, after = [], [], None
        try:
            for m in markers:
                observed = marker_pixels(raw, fmt, m)
                observations.append({"id": m["id"], "matched": observed == m["rgb"],
                                     "observedRgb": observed})
        except Exception as exc:
            errors.append({"phase": "final-markers", "message": str(exc),
                           "details": getattr(exc, "details", None)})
        try:
            after = self.geometry_guard(cal)
        except Exception as exc:
            errors.append({"phase": "geometry-after", "message": str(exc),
                           "details": getattr(exc, "details", None)})
        end = time.monotonic_ns()
        matched = len(observations) == 4 and all(m["matched"] for m in observations)
        timed_out = end >= deadline
        calibration_pattern = tuple(tuple(m["rgb"]) for m in sorted(cal["markers"], key=lambda m: m["id"]))
        ack = {"token": token, "captureId": capture_id, "calibrationId": ident,
               "nonce": nonce, "nonceMatched": matched,
               "freshSinceCalibration": nonce != cal["nonce"] and pattern != calibration_pattern,
               "rejected": not matched or timed_out or bool(errors), "timedOut": timed_out,
               "width": fmt["width"], "height": fmt["height"], "origin": cal["origin"],
               "format": fmt, "expectedMarkers": markers, "markerObservations": observations,
               "probeObservations": probe_observations, "probeReady": probe_ready,
               "geometryGuard": {"passed": not errors, "before": before, "after": after,
                                 "errors": errors},
               "timings": {"requestStartMonotonicNs": str(start),
                           "probeStartMonotonicNs": str(probe_start),
                           "probeEndMonotonicNs": str(probe_end),
                           **copy_timing, "ackReadyMonotonicNs": str(end),
                           "probeCount": probes, "probeRounds": rounds,
                           "probeMs": milliseconds(probe_start, probe_end),
                           "totalMs": milliseconds(start, end)}}
        frame["ack"] = ack
        return ack

    def export(self, req):
        token = req.get("token")
        if token in self.exported:
            require(req.get("basename") == self.exported[token]["basename"],
                    "An exported token cannot change its basename")
            return self.exported[token]
        require(token in self.frames, "Unknown capture token")
        basename = req.get("basename")
        require(isinstance(basename, str) and re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_.-]{0,199}", basename)
                and ".." not in basename and not basename.endswith((".png", ".raw", ".json")),
                "Export basename must be a safe name without extension")
        f = self.frames[token]; raw, fmt, cal, ack = f["raw"], f["format"], f["calibration"], f["ack"]
        f["exportBasename"] = basename
        start = time.monotonic_ns(); result = {"token": token, "basename": basename}
        def write_file(suffix, data):
            p = self.output / (basename + suffix)
            if p.exists():
                require(p.read_bytes() == data, "Refusing to overwrite different evidence", str(p))
            else:
                with p.open("xb") as stream:
                    stream.write(data)
            return {"path": str(p), "file": p.name, "bytes": len(data),
                    "sha256": hashlib.sha256(data).hexdigest()}
        try:
            # Native bytes first, even when later encoding or metadata fails.
            result["raw"] = write_file(".raw", raw)
            raw_written = time.monotonic_ns()
            rgba = native_to_rgba(raw, fmt); normalized = time.monotonic_ns()
            png = encode_png(rgba, fmt["width"], fmt["height"]); encoded = time.monotonic_ns()
            decoded = decode_own_png(png, fmt["width"], fmt["height"])
            require(decoded == rgba, "PNG round trip changed native RGB values")
            verified = time.monotonic_ns()
            equality = {"matched": True, "rgbaBytes": len(rgba), "width": fmt["width"],
                        "height": fmt["height"], "rgbaSha256": hashlib.sha256(rgba).hexdigest(),
                        "pngDecodedRgbaSha256": hashlib.sha256(decoded).hexdigest()}
            result["png"] = write_file(".png", png); png_written = time.monotonic_ns()
            timings = {"writeRawMs": milliseconds(start, raw_written),
                       "normalizeMs": milliseconds(raw_written, normalized),
                       "encodeMs": milliseconds(normalized, encoded),
                       "roundTripMs": milliseconds(encoded, verified),
                       "writePngMs": milliseconds(verified, png_written),
                       "beforeMetadataWriteMs": milliseconds(start, png_written)}
            meta = {"schema": SCHEMA, "kind": "native-x11-frame", "token": token,
                    "captureId": ack["captureId"], "calibrationId": ack["calibrationId"],
                    "setupId": self.runtime["setupId"], "nonce": ack["nonce"],
                    "viewport": cal["viewport"], "origin": cal["origin"], "window": cal["window"],
                    "nativeFormat": fmt, "expectedMarkers": f["expectedMarkers"],
                    "captureAck": ack, "probes": f["probes"],
                    "raw": result["raw"], "png": result["png"],
                    "pixelEquality": equality, "alphaPolicy": ALPHA_POLICY, "exportTimings": timings}
            result["metadata"] = write_file(".json", (json.dumps(meta, indent=2, ensure_ascii=False) + "\n").encode())
            result.update(pixelEquality=equality, rgbaSha256=equality["rgbaSha256"],
                          nativeFormat=fmt, alphaPolicy=ALPHA_POLICY, timings=timings)
            self.exported[token] = result
            del self.frames[token]
            return result
        except Exception as exc:
            # Keep the native format/identity readable even if PNG encoding or
            # the ordinary metadata write failed. Never overwrite another file.
            try:
                failed_meta = {"schema": SCHEMA, "kind": "native-x11-export-failure",
                               "token": token, "captureId": ack["captureId"],
                               "calibrationId": ack["calibrationId"], "nonce": ack["nonce"],
                               "origin": cal["origin"], "viewport": cal["viewport"],
                               "window": cal["window"], "nativeFormat": fmt,
                               "expectedMarkers": f["expectedMarkers"], "captureAck": ack,
                               "probes": f["probes"], "raw": result.get("raw"),
                               "png": result.get("png"), "rejected": True,
                               "exportError": str(exc), "alphaPolicy": ALPHA_POLICY}
                result["failureMetadata"] = write_file(
                    ".export-error.json", (json.dumps(failed_meta, indent=2) + "\n").encode())
            except Exception as metadata_error:
                result["failureMetadataError"] = str(metadata_error)
            raise GuardError(f"Native export failed: {exc}", getattr(exc, "details", None), result) from exc

    def close(self, _req=None):
        recovered, failures = [], []
        for token, frame in list(self.frames.items()):
            # close runs after the capture bracket, including error cleanup.
            # Orphans are diagnostic evidence only, never accepted screenshots.
            receipt = {"token": token, "rejected": True,
                       "reason": "unexported-native-frame-on-close"}
            try:
                basename = f"orphan-{os.getpid()}-{token}"
                raw_path = self.output / (basename + ".raw")
                raw = frame["raw"]
                with raw_path.open("xb") as stream:
                    stream.write(raw)
                receipt["raw"] = {"path": str(raw_path), "file": raw_path.name,
                                  "bytes": len(raw), "sha256": hashlib.sha256(raw).hexdigest()}
                cal = frame["calibration"]
                metadata = {"schema": SCHEMA, "kind": "native-x11-orphan",
                            **receipt, "setupId": self.runtime["setupId"],
                            "captureId": frame.get("captureId"),
                            "calibrationId": cal["calibrationId"], "nonce": frame.get("nonce"),
                            "origin": cal["origin"], "viewport": cal["viewport"],
                            "window": cal["window"], "nativeFormat": frame["format"],
                            "expectedMarkers": frame["expectedMarkers"],
                            "captureAck": frame.get("ack"), "probes": frame.get("probes", []),
                            "previousExportBasename": frame.get("exportBasename"),
                            "alphaPolicy": ALPHA_POLICY}
                data = (json.dumps(metadata, indent=2) + "\n").encode()
                meta_path = self.output / (basename + ".json")
                with meta_path.open("xb") as stream:
                    stream.write(data)
                receipt["metadata"] = {"path": str(meta_path), "file": meta_path.name,
                                       "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()}
                recovered.append(receipt)
                del self.frames[token]
            except Exception as exc:
                failures.append({**receipt, "error": str(exc)})
        if self.x:
            self.x.close(); self.x = None
        self.closed = True
        return {"closed": True, "recoveredOrphans": recovered,
                "recoveryFailures": failures, "unexportedTokens": list(self.frames)}

    def dispatch(self, req):
        require(isinstance(req, dict), "Request must be an object")
        op = req.get("op")
        require(op in ("setup", "calibrate", "capture", "export", "close"), "Unknown operation")
        return getattr(self, op)(req)


def main():
    helper = Helper()
    try:
        for line in sys.stdin:
            ident = None
            try:
                require(len(line) <= 65536, "JSONL request exceeds 64 KiB")
                req = json.loads(line); ident = req.get("id") if isinstance(req, dict) else None
                require(type(ident) in (int, str), "Request id is required")
                result = helper.dispatch(req)
                reply = {"id": ident, "ok": True, "result": result}
            except Exception as exc:
                reply = {"id": ident, "ok": False,
                         "error": {"message": str(exc), "type": type(exc).__name__,
                                   "details": getattr(exc, "details", None)}}
                if getattr(exc, "result", None) is not None:
                    reply["result"] = exc.result
            print(json.dumps(reply, separators=(",", ":"), ensure_ascii=False), flush=True)
            if helper.closed:
                break
    finally:
        if not helper.closed:
            recovery = helper.close()
            if recovery["recoveredOrphans"] or recovery["recoveryFailures"]:
                print(json.dumps({"orphanRecovery": recovery}), file=sys.stderr, flush=True)


if __name__ == "__main__":
    main()
