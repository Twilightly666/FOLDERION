import base64
import ctypes
import json
import mimetypes
import os
import pathlib
import secrets
import shlex
import shutil
import stat
import struct
import subprocess
import sys
import tarfile
import tempfile
import threading
import time
import uuid
import webbrowser
import zipfile
import zlib
from ctypes import wintypes
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, quote, unquote, urlparse

import webview

try:
    import py7zr
except Exception:
    py7zr = None

IS_WINDOWS = sys.platform == "win32"


def work_area():
    rect = wintypes.RECT()
    ctypes.windll.user32.SystemParametersInfoW(0x0030, 0, ctypes.byref(rect), 0)
    return rect.left, rect.top, rect.right - rect.left, rect.bottom - rect.top


def place(x, y, w, h):
    window = webview.windows[0]
    hwnd = int(window.native.Handle.ToInt64())
    ctypes.windll.user32.SetWindowPos(hwnd, 0, int(x), int(y), int(w), int(h), 0x0004 | 0x0040)


def centered_rect():
    left, top, width, height = work_area()
    w = int(width * 0.62)
    h = int(height * 0.72)
    return left + (width - w) // 2, top + (height - h) // 2, w, h


def known_folder(guid, fallback):
    if not IS_WINDOWS:
        return fallback
    try:
        func = ctypes.windll.shell32.SHGetKnownFolderPath
        func.argtypes = [ctypes.c_char_p, wintypes.DWORD, wintypes.HANDLE, ctypes.POINTER(ctypes.c_void_p)]
        func.restype = ctypes.c_long
        buffer = ctypes.c_void_p()
        if func(uuid.UUID(guid).bytes_le, 0, None, ctypes.byref(buffer)) != 0:
            return fallback
        path = ctypes.wstring_at(buffer.value)
        ctypes.windll.ole32.CoTaskMemFree(ctypes.c_void_p(buffer.value))
        return path
    except Exception:
        return fallback


def list_drives():
    if not IS_WINDOWS:
        return [{"name": "/", "path": "/", "is_dir": True, "size": 0, "modified": None}]
    mask = ctypes.windll.kernel32.GetLogicalDrives()
    drives = []
    for index in range(26):
        if mask & (1 << index):
            letter = chr(65 + index) + ":\\"
            drives.append({"name": letter, "path": letter, "is_dir": True, "size": 0, "modified": None})
    return drives


def describe(entry, show_hidden=False):
    try:
        stat = entry.stat()
        attributes = getattr(stat, "st_file_attributes", 0)
        hidden = bool(attributes & 0x6)
        if hidden and not show_hidden:
            return None
        is_dir = entry.is_dir()
        return {
            "name": entry.name,
            "path": entry.path,
            "is_dir": is_dir,
            "size": 0 if is_dir else stat.st_size,
            "modified": stat.st_mtime,
            "hidden": hidden,
        }
    except OSError:
        return None


class ShFileInfo(ctypes.Structure):
    _fields_ = [
        ("hIcon", ctypes.c_void_p),
        ("iIcon", ctypes.c_int),
        ("dwAttributes", wintypes.DWORD),
        ("szDisplayName", ctypes.c_wchar * 260),
        ("szTypeName", ctypes.c_wchar * 80),
    ]


class IconInfo(ctypes.Structure):
    _fields_ = [
        ("fIcon", wintypes.BOOL),
        ("xHotspot", wintypes.DWORD),
        ("yHotspot", wintypes.DWORD),
        ("hbmMask", ctypes.c_void_p),
        ("hbmColor", ctypes.c_void_p),
    ]


class BitmapStruct(ctypes.Structure):
    _fields_ = [
        ("bmType", ctypes.c_long),
        ("bmWidth", ctypes.c_long),
        ("bmHeight", ctypes.c_long),
        ("bmWidthBytes", ctypes.c_long),
        ("bmPlanes", ctypes.c_ushort),
        ("bmBitsPixel", ctypes.c_ushort),
        ("bmBits", ctypes.c_void_p),
    ]


class BitmapInfoHeader(ctypes.Structure):
    _fields_ = [
        ("biSize", wintypes.DWORD),
        ("biWidth", ctypes.c_long),
        ("biHeight", ctypes.c_long),
        ("biPlanes", ctypes.c_ushort),
        ("biBitCount", ctypes.c_ushort),
        ("biCompression", wintypes.DWORD),
        ("biSizeImage", wintypes.DWORD),
        ("biXPelsPerMeter", ctypes.c_long),
        ("biYPelsPerMeter", ctypes.c_long),
        ("biClrUsed", wintypes.DWORD),
        ("biClrImportant", wintypes.DWORD),
    ]


ICON_CACHE = {}
ICON_API_READY = False


def setup_icon_api():
    global ICON_API_READY
    if ICON_API_READY:
        return
    shell32 = ctypes.windll.shell32
    user32 = ctypes.windll.user32
    gdi32 = ctypes.windll.gdi32
    shell32.SHGetFileInfoW.argtypes = [wintypes.LPCWSTR, wintypes.DWORD, ctypes.POINTER(ShFileInfo), wintypes.UINT, wintypes.UINT]
    shell32.SHGetFileInfoW.restype = ctypes.c_size_t
    user32.GetIconInfo.argtypes = [ctypes.c_void_p, ctypes.POINTER(IconInfo)]
    user32.GetIconInfo.restype = wintypes.BOOL
    user32.DestroyIcon.argtypes = [ctypes.c_void_p]
    user32.GetDC.argtypes = [ctypes.c_void_p]
    user32.GetDC.restype = ctypes.c_void_p
    user32.ReleaseDC.argtypes = [ctypes.c_void_p, ctypes.c_void_p]
    gdi32.GetObjectW.argtypes = [ctypes.c_void_p, ctypes.c_int, ctypes.c_void_p]
    gdi32.GetObjectW.restype = ctypes.c_int
    gdi32.GetDIBits.argtypes = [ctypes.c_void_p, ctypes.c_void_p, wintypes.UINT, wintypes.UINT, ctypes.c_void_p, ctypes.c_void_p, wintypes.UINT]
    gdi32.GetDIBits.restype = ctypes.c_int
    gdi32.DeleteObject.argtypes = [ctypes.c_void_p]
    ICON_API_READY = True


def read_pixels(hdc, bitmap, width, height):
    header = BitmapInfoHeader(ctypes.sizeof(BitmapInfoHeader), width, -height, 1, 32, 0, 0, 0, 0, 0, 0)
    buffer = ctypes.create_string_buffer(width * height * 4)
    ctypes.windll.gdi32.GetDIBits(hdc, bitmap, 0, height, buffer, ctypes.byref(header), 0)
    return bytearray(buffer.raw)


def encode_png(width, height, rgba):
    stride = width * 4
    raw = b"".join(b"\x00" + bytes(rgba[row * stride:(row + 1) * stride]) for row in range(height))

    def chunk(tag, data):
        body = tag + data
        return struct.pack(">I", len(data)) + body + struct.pack(">I", zlib.crc32(body) & 0xFFFFFFFF)

    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(raw))
        + chunk(b"IEND", b"")
    )


def icon_data_url(path):
    key = path.lower()
    if key in ICON_CACHE:
        return ICON_CACHE[key]
    result = None
    try:
        setup_icon_api()
        ctypes.windll.ole32.CoInitialize(None)
        info = ShFileInfo()
        ok = ctypes.windll.shell32.SHGetFileInfoW(path, 0, ctypes.byref(info), ctypes.sizeof(info), 0x100)
        if ok and info.hIcon:
            icon_info = IconInfo()
            if ctypes.windll.user32.GetIconInfo(info.hIcon, ctypes.byref(icon_info)) and icon_info.hbmColor:
                bitmap = BitmapStruct()
                ctypes.windll.gdi32.GetObjectW(icon_info.hbmColor, ctypes.sizeof(bitmap), ctypes.byref(bitmap))
                width, height = bitmap.bmWidth, bitmap.bmHeight
                hdc = ctypes.windll.user32.GetDC(None)
                pixels = read_pixels(hdc, icon_info.hbmColor, width, height)
                if not any(pixels[3::4]):
                    mask = read_pixels(hdc, icon_info.hbmMask, width, height)
                    for index in range(width * height):
                        pixels[index * 4 + 3] = 0 if mask[index * 4] else 255
                ctypes.windll.user32.ReleaseDC(None, hdc)
                pixels[0::4], pixels[2::4] = pixels[2::4], pixels[0::4]
                png = encode_png(width, height, pixels)
                result = "data:image/png;base64," + base64.b64encode(png).decode("ascii")
            if icon_info.hbmColor:
                ctypes.windll.gdi32.DeleteObject(icon_info.hbmColor)
            if icon_info.hbmMask:
                ctypes.windll.gdi32.DeleteObject(icon_info.hbmMask)
            ctypes.windll.user32.DestroyIcon(info.hIcon)
    except Exception:
        result = None
    ICON_CACHE[key] = result
    return result


AUDIO_TYPES = {
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".flac": "audio/flac",
    ".ogg": "audio/ogg",
    ".m4a": "audio/mp4",
    ".aac": "audio/aac",
    ".wma": "audio/x-ms-wma",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".jpe": "image/jpeg",
    ".jfif": "image/jpeg",
    ".gif": "image/gif",
    ".bmp": "image/bmp",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".avif": "image/avif",
    ".tif": "image/tiff",
    ".tiff": "image/tiff",
    ".heic": "image/heic",
    ".mp4": "video/mp4",
    ".mkv": "video/x-matroska",
    ".avi": "video/x-msvideo",
    ".mov": "video/quicktime",
    ".wmv": "video/x-ms-wmv",
    ".webm": "video/webm",
    ".flv": "video/x-flv",
}
MEDIA = {"port": 0, "token": secrets.token_urlsafe(16)}


class MediaHandler(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def do_GET(self):
        query = parse_qs(urlparse(self.path).query)
        if query.get("t", [""])[0] != MEDIA["token"]:
            self.send_error(403)
            return
        path = query.get("p", [""])[0]
        ext = os.path.splitext(path)[1].lower()
        if ext not in AUDIO_TYPES or not os.path.isfile(path):
            self.send_error(404)
            return
        try:
            size = os.path.getsize(path)
            start, end = 0, size - 1
            status = 200
            header = self.headers.get("Range")
            if header and header.startswith("bytes="):
                first, _, last = header[6:].split(",")[0].partition("-")
                if first:
                    start = int(first)
                    if last:
                        end = min(int(last), size - 1)
                elif last:
                    start = max(size - int(last), 0)
                if start > end or start >= size:
                    self.send_response(416)
                    self.send_header("Content-Range", "bytes */" + str(size))
                    self.end_headers()
                    return
                status = 206
            self.send_response(status)
            self.send_header("Content-Type", AUDIO_TYPES[ext])
            self.send_header("Accept-Ranges", "bytes")
            self.send_header("Content-Length", str(end - start + 1))
            if status == 206:
                self.send_header("Content-Range", "bytes %d-%d/%d" % (start, end, size))
            self.end_headers()
            with open(path, "rb") as source:
                source.seek(start)
                left = end - start + 1
                while left > 0:
                    data = source.read(min(65536, left))
                    if not data:
                        break
                    self.wfile.write(data)
                    left -= len(data)
        except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError):
            pass
        except Exception:
            try:
                self.send_error(500)
            except Exception:
                pass


def start_media_server():
    server = ThreadingHTTPServer(("127.0.0.1", 0), MediaHandler)
    MEDIA["port"] = server.server_address[1]
    threading.Thread(target=server.serve_forever, daemon=True).start()


CHUNK = 1024 * 1024
INVALID_CHARS = set('\\/:*?"<>|')
RESERVED_NAMES = {"CON", "PRN", "AUX", "NUL"} | {"COM%d" % i for i in range(1, 10)} | {"LPT%d" % i for i in range(1, 10)}
JOBS = {}
JOB_LOCK = threading.Lock()
JOB_COUNTER = {"value": 0}
UNDO_STACK = []


EDIT_LIMIT = 2 * 1024 * 1024


def decode_text(data):
    if data.startswith(b"\xef\xbb\xbf"):
        return data[3:].decode("utf-8"), "utf-8-sig"
    if data.startswith((b"\xff\xfe", b"\xfe\xff")):
        return data.decode("utf-16"), "utf-16"
    if b"\0" in data:
        raise ValueError("Це не текстовий файл")
    try:
        return data.decode("utf-8"), "utf-8"
    except UnicodeDecodeError:
        return data.decode("cp1251", errors="replace"), "cp1251"


class Cancelled(Exception):
    pass


def norm(path):
    return os.path.normcase(os.path.abspath(path))


def is_junction(path):
    check = getattr(os.path, "isjunction", None)
    try:
        return bool(check(path)) if check else False
    except OSError:
        return False


def children(path):
    result = []
    with os.scandir(path) as scan:
        for entry in scan:
            try:
                is_dir = entry.is_dir(follow_symlinks=False)
                if entry.is_symlink() and entry.is_dir():
                    continue
                if is_dir and is_junction(entry.path):
                    continue
            except OSError:
                continue
            result.append((entry.name, entry.path, is_dir))
    return result


def tree_stats(path):
    if not os.path.isdir(path):
        try:
            return os.path.getsize(path), 1
        except OSError:
            return 0, 1
    size = 0
    count = 0
    stack = [path]
    while stack:
        current = stack.pop()
        try:
            items = children(current)
        except OSError:
            continue
        for name, child, is_dir in items:
            if is_dir:
                stack.append(child)
            else:
                try:
                    size += os.path.getsize(child)
                except OSError:
                    pass
                count += 1
    return size, count


def unique_name(directory, name, is_dir, style):
    stem, ext = (name, "") if is_dir else os.path.splitext(name)
    counter = 2
    if style == "copy":
        candidate = stem + " — копія" + ext
        while os.path.lexists(os.path.join(directory, candidate)):
            candidate = "%s — копія (%d)%s" % (stem, counter, ext)
            counter += 1
    else:
        candidate = "%s (%d)%s" % (stem, counter, ext)
        while os.path.lexists(os.path.join(directory, candidate)):
            counter += 1
            candidate = "%s (%d)%s" % (stem, counter, ext)
    return candidate


def describe_error(error):
    if isinstance(error, PermissionError):
        return "Немає доступу або файл зайнятий іншою програмою"
    if isinstance(error, FileNotFoundError):
        return "Файл або папку не знайдено"
    if isinstance(error, FileExistsError):
        return "Елемент з таким іменем уже існує"
    if isinstance(error, OSError) and error.errno == 28:
        return "Недостатньо вільного місця на диску"
    if isinstance(error, OSError) and error.strerror:
        return error.strerror
    return str(error) or "Невідома помилка"


def check_name(name):
    if not name:
        return "Ім’я не може бути порожнім."
    if len(name) > 255:
        return "Ім’я занадто довге (максимум 255 символів)."
    if all(char == "." for char in name):
        return "Ім’я не може складатися лише з крапок."
    if any(ord(char) < 32 for char in name):
        return "Ім’я містить недопустимі керівні символи."
    if IS_WINDOWS:
        if any(char in INVALID_CHARS for char in name):
            return "Ім’я не може містити жодного з символів: \\ / : * ? \" < > |"
        if name.endswith(".") or name.endswith(" "):
            return "Ім’я не може закінчуватися крапкою чи пробілом."
        if name.split(".")[0].strip().upper() in RESERVED_NAMES:
            return "Ім’я «%s» зарезервоване системою." % name
    elif "/" in name:
        return "Ім’я не може містити символ «/»."
    return None


def mirror_attributes(source, target):
    try:
        shutil.copystat(source, target)
    except OSError:
        pass
    if IS_WINDOWS:
        try:
            flags = os.stat(source).st_file_attributes & 0x27
            ctypes.windll.kernel32.SetFileAttributesW(target, flags or 0x80)
        except Exception:
            pass


def hide_file(path):
    if IS_WINDOWS:
        try:
            ctypes.windll.kernel32.SetFileAttributesW(path, 0x2)
        except Exception:
            pass


def force_replace(source, target):
    try:
        os.replace(source, target)
    except PermissionError:
        if not os.path.exists(target):
            raise
        os.chmod(target, stat.S_IWRITE)
        os.replace(source, target)


def remove_path(path):
    if os.path.islink(path) or is_junction(path):
        try:
            os.unlink(path)
        except OSError:
            os.rmdir(path)
        return
    if os.path.isdir(path):
        with os.scandir(path) as scan:
            names = [entry.path for entry in scan]
        for child in names:
            remove_path(child)
        os.rmdir(path)
        return
    try:
        os.remove(path)
    except PermissionError:
        os.chmod(path, stat.S_IWRITE)
        os.remove(path)


def data_dir():
    if IS_WINDOWS:
        base = os.environ.get("APPDATA") or os.path.expanduser("~")
    else:
        base = os.path.join(os.path.expanduser("~"), ".config")
    path = os.path.join(base, "FOLDERION")
    os.makedirs(path, exist_ok=True)
    return path


def load_settings():
    try:
        with open(os.path.join(data_dir(), "settings.json"), "r", encoding="utf-8") as handle:
            data = json.load(handle)
        return data if isinstance(data, dict) else {}
    except (OSError, ValueError):
        return {}


def save_settings(data):
    target = os.path.join(data_dir(), "settings.json")
    temporary = target + ".tmp"
    with open(temporary, "w", encoding="utf-8") as handle:
        json.dump(data, handle, ensure_ascii=False, indent=2)
    os.replace(temporary, target)


def start_folder():
    for argument in sys.argv[1:]:
        if os.path.isdir(argument):
            return os.path.abspath(argument)
    return ""


def sevenzip_command():
    for name in ("7z", "7za", "7zz"):
        found = shutil.which(name)
        if found:
            return found
    for base in (os.environ.get("ProgramFiles"), os.environ.get("ProgramFiles(x86)")):
        if base:
            candidate = os.path.join(base, "7-Zip", "7z.exe")
            if os.path.isfile(candidate):
                return candidate
    return None


def set_clipboard_text(text):
    text = text.replace("\r\n", "\n").replace("\n", "\r\n")
    if IS_WINDOWS:
        user32 = ctypes.windll.user32
        kernel32 = ctypes.windll.kernel32
        kernel32.GlobalAlloc.restype = ctypes.c_void_p
        kernel32.GlobalAlloc.argtypes = [ctypes.c_uint, ctypes.c_size_t]
        kernel32.GlobalLock.restype = ctypes.c_void_p
        kernel32.GlobalLock.argtypes = [ctypes.c_void_p]
        kernel32.GlobalUnlock.argtypes = [ctypes.c_void_p]
        kernel32.GlobalFree.argtypes = [ctypes.c_void_p]
        user32.OpenClipboard.argtypes = [ctypes.c_void_p]
        user32.SetClipboardData.argtypes = [ctypes.c_uint, ctypes.c_void_p]
        encoded = (text + "\0").encode("utf-16-le")
        handle = kernel32.GlobalAlloc(0x0002, len(encoded))
        if not handle:
            raise OSError("Не вдалося виділити пам’ять для буфера обміну")
        pointer = kernel32.GlobalLock(handle)
        ctypes.memmove(pointer, encoded, len(encoded))
        kernel32.GlobalUnlock(handle)
        opened = False
        for attempt in range(10):
            if user32.OpenClipboard(None):
                opened = True
                break
            time.sleep(0.05)
        if not opened:
            kernel32.GlobalFree(handle)
            raise OSError("Буфер обміну зайнятий іншою програмою")
        try:
            user32.EmptyClipboard()
            if not user32.SetClipboardData(13, handle):
                kernel32.GlobalFree(handle)
                raise OSError("Не вдалося записати в буфер обміну")
        finally:
            user32.CloseClipboard()
        return
    for command in (["wl-copy"], ["xclip", "-selection", "clipboard"], ["xsel", "-bi"]):
        if shutil.which(command[0]):
            subprocess.run(command, input=text.encode("utf-8"), check=True)
            return
    raise OSError("Буфер обміну недоступний у цій системі")


class CountingReader:
    def __init__(self, handle, job):
        self.handle = handle
        self.job = job

    def read(self, size=-1):
        self.job.check()
        block = self.handle.read(size)
        self.job.done += len(block)
        return block


class ShFileOp(ctypes.Structure):
    _pack_ = 1 if ctypes.sizeof(ctypes.c_void_p) == 4 else 8
    _fields_ = [
        ("hwnd", ctypes.c_void_p),
        ("wFunc", ctypes.c_uint),
        ("pFrom", ctypes.c_wchar_p),
        ("pTo", ctypes.c_wchar_p),
        ("fFlags", ctypes.c_ushort),
        ("fAnyOperationsAborted", ctypes.c_int),
        ("hNameMappings", ctypes.c_void_p),
        ("lpszProgressTitle", ctypes.c_wchar_p),
    ]


def trash_path(path):
    path = os.path.abspath(path)
    if IS_WINDOWS:
        operation = ShFileOp()
        operation.wFunc = 3
        operation.pFrom = path + "\0"
        operation.pTo = None
        operation.fFlags = 0x454
        result = ctypes.windll.shell32.SHFileOperationW(ctypes.byref(operation))
        if result != 0 or operation.fAnyOperationsAborted:
            raise OSError("Не вдалося перемістити до кошика (код %d)" % result)
        return
    try:
        subprocess.run(["gio", "trash", path], check=True, capture_output=True)
    except (OSError, subprocess.CalledProcessError):
        raise OSError("Кошик недоступний у цій системі")


TRASH_URI = "trash://"


def filetime_to_unix(value):
    return (value - 116444736000000000) / 10000000.0


def read_recycle_info(info_path):
    with open(info_path, "rb") as handle:
        data = handle.read(2048)
    if len(data) < 24:
        return None
    version, size, stamp = struct.unpack("<qqq", data[:24])
    if version == 2:
        if len(data) < 28:
            return None
        length = struct.unpack("<I", data[24:28])[0]
        raw = data[28:28 + length * 2]
    else:
        raw = data[24:24 + 520]
    original = raw.decode("utf-16-le", errors="ignore").split("\0")[0]
    if not original:
        return None
    return original, size, filetime_to_unix(stamp)


def list_trash_windows():
    entries = []
    mask = ctypes.windll.kernel32.GetLogicalDrives()
    for index in range(26):
        if not mask & (1 << index):
            continue
        root = chr(65 + index) + ":\\"
        if ctypes.windll.kernel32.GetDriveTypeW(root) != 3:
            continue
        bin_dir = root + "$Recycle.Bin"
        try:
            owners = [item.path for item in os.scandir(bin_dir) if item.is_dir(follow_symlinks=False)]
        except OSError:
            continue
        for owner in owners:
            try:
                scan = list(os.scandir(owner))
            except OSError:
                continue
            for item in scan:
                if not item.name.startswith("$I"):
                    continue
                payload = os.path.join(owner, "$R" + item.name[2:])
                if not os.path.lexists(payload):
                    continue
                try:
                    parsed = read_recycle_info(item.path)
                except OSError:
                    parsed = None
                if not parsed:
                    continue
                original, size, deleted = parsed
                is_dir = os.path.isdir(payload)
                try:
                    changed = os.lstat(payload).st_mtime
                except OSError:
                    changed = deleted
                entries.append({
                    "name": os.path.basename(original.rstrip("\\/")) or original,
                    "path": payload,
                    "is_dir": is_dir,
                    "size": size,
                    "modified": changed,
                    "deleted": deleted,
                    "hidden": False,
                    "original": original,
                    "info": item.path,
                })
    return entries


def trash_locations_linux():
    data_home = os.environ.get("XDG_DATA_HOME") or os.path.join(os.path.expanduser("~"), ".local", "share")
    found = [(os.path.join(data_home, "Trash"), None)]
    uid = os.getuid()
    try:
        with open("/proc/mounts", encoding="utf-8", errors="ignore") as handle:
            mounts = {line.split()[1].replace("\\040", " ") for line in handle if len(line.split()) > 1}
    except OSError:
        mounts = set()
    for top in sorted(mounts):
        for candidate in (os.path.join(top, ".Trash", str(uid)), os.path.join(top, ".Trash-%d" % uid)):
            if os.path.isdir(os.path.join(candidate, "info")) and all(candidate != item[0] for item in found):
                found.append((candidate, top))
    return found


def list_trash_linux():
    entries = []
    for trash, top in trash_locations_linux():
        info_dir = os.path.join(trash, "info")
        try:
            names = os.listdir(info_dir)
        except OSError:
            continue
        for name in names:
            if not name.endswith(".trashinfo"):
                continue
            info_path = os.path.join(info_dir, name)
            payload = os.path.join(trash, "files", name[:-len(".trashinfo")])
            if not os.path.lexists(payload):
                continue
            original = ""
            deleted = None
            try:
                with open(info_path, encoding="utf-8", errors="ignore") as handle:
                    for line in handle:
                        if line.startswith("Path="):
                            original = unquote(line[5:].strip())
                        elif line.startswith("DeletionDate="):
                            try:
                                deleted = time.mktime(time.strptime(line[13:].strip(), "%Y-%m-%dT%H:%M:%S"))
                            except ValueError:
                                deleted = None
            except OSError:
                continue
            if not original:
                continue
            if not os.path.isabs(original):
                original = os.path.join(top or "/", original)
            try:
                info = os.lstat(payload)
            except OSError:
                continue
            is_dir = os.path.isdir(payload) and not os.path.islink(payload)
            entries.append({
                "name": os.path.basename(original.rstrip("/")) or original,
                "path": payload,
                "is_dir": is_dir,
                "size": tree_stats(payload)[0] if is_dir else info.st_size,
                "modified": info.st_mtime,
                "deleted": deleted if deleted is not None else info.st_mtime,
                "hidden": False,
                "original": original,
                "info": info_path,
            })
    return entries


def list_trash():
    entries = list_trash_windows() if IS_WINDOWS else list_trash_linux()
    entries.sort(key=lambda item: (not item["is_dir"], item["name"].casefold()))
    return entries


def side_info(path):
    is_dir = os.path.isdir(path)
    try:
        info = os.stat(path)
        return {"name": os.path.basename(path), "is_dir": is_dir, "size": 0 if is_dir else info.st_size, "modified": info.st_mtime}
    except OSError:
        return {"name": os.path.basename(path), "is_dir": is_dir, "size": 0, "modified": None}


ARCHIVE_SUFFIXES = (".tar.gz", ".tar.bz2", ".tar.xz", ".tgz", ".tbz2", ".txz", ".zip", ".tar", ".7z")
ARCHIVE_CACHE = {}


def is_archive_name(name):
    lowered = name.lower()
    return any(lowered.endswith(suffix) for suffix in ARCHIVE_SUFFIXES)


def archive_kind(path):
    lowered = path.lower()
    if lowered.endswith(".zip"):
        return "zip"
    if lowered.endswith(".7z"):
        return "7z"
    return "tar"


def archive_stem(name):
    lowered = name.lower()
    for suffix in ARCHIVE_SUFFIXES:
        if lowered.endswith(suffix):
            return name[:-len(suffix)] or name
    return name


def split_archive(path):
    lowered = path.lower()
    if not any(suffix in lowered for suffix in ARCHIVE_SUFFIXES):
        return None
    current = path
    parts = []
    while True:
        if is_archive_name(current) and os.path.isfile(current):
            return current, "/".join(reversed(parts))
        up = os.path.dirname(current)
        if up == current:
            return None
        parts.append(os.path.basename(current))
        current = up


def clean_member_name(name):
    parts = [part for part in name.replace("\\", "/").split("/") if part not in ("", ".", "..")]
    return "/".join(parts)


def member_target(root, name):
    parts = [part for part in clean_member_name(name).split("/") if part != ".."]
    if not parts:
        return None
    base = os.path.abspath(root)
    path = os.path.abspath(os.path.join(base, *parts))
    if os.path.commonpath([path, base]) != base:
        return None
    return path


def zip_time(date_time):
    try:
        return time.mktime(tuple(date_time) + (0, 0, -1))
    except (OverflowError, ValueError):
        return 0.0


def seven_time(value):
    try:
        if hasattr(value, "totimestamp"):
            return float(value.totimestamp())
        return float(value.timestamp())
    except Exception:
        return 0.0


def read_archive_index(archive):
    info = os.stat(archive)
    key = (info.st_mtime_ns, info.st_size)
    cached = ARCHIVE_CACHE.get(archive)
    if cached and cached[0] == key:
        return cached[1]
    kind = archive_kind(archive)
    rows = []
    if kind == "zip":
        with zipfile.ZipFile(archive) as handle:
            for item in handle.infolist():
                name = clean_member_name(item.filename)
                if name:
                    rows.append((name, item.is_dir(), item.file_size, zip_time(item.date_time)))
    elif kind == "tar":
        with tarfile.open(archive) as handle:
            for member in handle:
                name = clean_member_name(member.name)
                if name:
                    rows.append((name, member.isdir(), member.size, float(member.mtime)))
    else:
        if not py7zr:
            raise OSError("Для перегляду 7z потрібна бібліотека py7zr (pip install py7zr).")
        with py7zr.SevenZipFile(archive) as handle:
            for item in handle.list():
                name = clean_member_name(item.filename)
                if name:
                    rows.append((name, bool(item.is_directory), item.uncompressed or 0, seven_time(item.creationtime)))
    ARCHIVE_CACHE.clear()
    ARCHIVE_CACHE[archive] = (key, rows)
    return rows


def list_archive(archive, inner):
    rows = read_archive_index(archive)
    prefix = inner + "/" if inner else ""
    base = archive + (os.sep + inner.replace("/", os.sep) if inner else "")
    found = {}
    for name, is_dir, size, mtime in rows:
        if prefix and not name.startswith(prefix):
            continue
        rest = name[len(prefix):]
        if not rest:
            continue
        head, separator, tail = rest.partition("/")
        if separator:
            current = found.get(head)
            if not current or not current["is_dir"]:
                found[head] = {"is_dir": True, "size": 0, "modified": mtime}
        else:
            found[head] = {"is_dir": is_dir, "size": 0 if is_dir else size, "modified": mtime}
    entries = [
        {"name": name, "path": base + os.sep + name, "is_dir": value["is_dir"], "size": value["size"], "modified": value["modified"], "hidden": False}
        for name, value in found.items()
    ]
    entries.sort(key=lambda item: (not item["is_dir"], item["name"].casefold()))
    return entries


def extract_member(archive, inner, folder):
    kind = archive_kind(archive)
    parts = [part for part in inner.split("/") if part]
    if not parts:
        raise OSError("Файл не знайдено в архіві.")
    if kind == "zip":
        out = os.path.join(folder, parts[-1])
        with zipfile.ZipFile(archive) as handle:
            for item in handle.infolist():
                if not item.is_dir() and clean_member_name(item.filename) == inner:
                    with handle.open(item) as reader, open(out, "wb") as writer:
                        shutil.copyfileobj(reader, writer, CHUNK)
                    return out
    elif kind == "tar":
        out = os.path.join(folder, parts[-1])
        with tarfile.open(archive) as handle:
            for member in handle:
                if member.isreg() and clean_member_name(member.name) == inner:
                    with handle.extractfile(member) as reader, open(out, "wb") as writer:
                        shutil.copyfileobj(reader, writer, CHUNK)
                    return out
    else:
        if not py7zr:
            raise OSError("Для формату 7z потрібна бібліотека py7zr.")
        with py7zr.SevenZipFile(archive) as handle:
            for name in handle.getnames():
                if clean_member_name(name) == inner:
                    handle.extract(path=folder, targets=[name])
                    return os.path.join(folder, *parts)
    raise OSError("Файл не знайдено в архіві.")


class Job:
    def __init__(self, mode, items, dest, title, record=True):
        JOB_COUNTER["value"] += 1
        self.id = JOB_COUNTER["value"]
        self.mode = mode
        self.items = items
        self.dest = dest
        self.title = title
        self.record = record
        self.state = "queued"
        self.total = 0
        self.done = 0
        self.files_total = 0
        self.files_done = 0
        self.current = ""
        self.conflict = None
        self.conflict_seq = 0
        self.event = threading.Event()
        self.answer = None
        self.sticky = {}
        self.cancelled = False
        self.errors = []
        self.made = []
        self.selected = []
        self.stats = {}
        self.started = 0.0
        self.waited = 0.0
        self.wait_since = 0.0
        self.finished = False
        self.finished_at = 0.0
        self.archive_kind = ""
        self.after = {}
        self.restore = False
        self.members = None
        self.source = os.path.dirname(items[0][0].rstrip("\\/")) if items else ""
        self.first = os.path.basename(items[0][0].rstrip("\\/")) if items else ""

    def wanted(self, name):
        if self.members is None:
            return True
        return any(name == item or name.startswith(item + "/") for item in self.members)

    def snapshot(self):
        active = 0.0
        if self.started:
            now = time.monotonic()
            ongoing = now - self.wait_since if self.wait_since else 0.0
            active = max(now - self.started - self.waited - ongoing, 0.0)
        speed = self.done / active if active > 0.4 else 0.0
        return {
            "id": self.id,
            "mode": "restore" if self.restore else self.mode,
            "title": self.title,
            "state": self.state,
            "total": self.total,
            "done": self.done,
            "files_total": self.files_total,
            "files_done": self.files_done,
            "current": self.current,
            "speed": speed,
            "conflict": self.conflict,
            "errors": list(self.errors) if self.finished else [],
            "selected": list(self.selected) if self.finished else [],
            "finished": self.finished,
            "count": len(self.items),
            "first": self.first,
            "source": self.source,
            "dest": self.dest,
        }

    def cancel(self):
        self.cancelled = True
        self.event.set()

    def answer_conflict(self, action, apply_all):
        conflict = self.conflict
        if not conflict:
            return False
        allowed = {
            "dir": ("merge", "skip", "both", "cancel"),
            "file": ("replace", "skip", "both", "cancel"),
            "mixed": ("skip", "both", "cancel"),
        }[conflict["kind"]]
        if action not in allowed:
            return False
        self.answer = (action, bool(apply_all))
        self.event.set()
        return True

    def check(self):
        if self.cancelled:
            raise Cancelled()

    def stat_of(self, path):
        if path not in self.stats:
            self.stats[path] = tree_stats(path)
        return self.stats[path]

    def skip(self, path):
        size, count = self.stat_of(path)
        self.done += size
        self.files_done += count

    def fail(self, path, error):
        name = os.path.basename(path.rstrip("\\/")) or path
        self.errors.append({"name": name, "error": describe_error(error)})

    def resolve(self, src, target, dst_dir, src_is_dir):
        target_is_dir = os.path.isdir(target)
        if src_is_dir and target_is_dir:
            kind = "dir"
        elif not src_is_dir and not target_is_dir:
            kind = "file"
        else:
            kind = "mixed"
        if kind in self.sticky:
            return self.sticky[kind]
        self.conflict_seq += 1
        self.answer = None
        self.event.clear()
        self.conflict = {
            "seq": self.conflict_seq,
            "kind": kind,
            "name": os.path.basename(target),
            "folder": dst_dir,
            "incoming": side_info(src),
            "existing": side_info(target),
        }
        self.state = "conflict"
        self.wait_since = time.monotonic()
        while not self.event.wait(0.2):
            if self.cancelled:
                break
        self.waited += time.monotonic() - self.wait_since
        self.wait_since = 0.0
        self.conflict = None
        self.state = "running"
        self.check()
        action, apply_all = self.answer or ("cancel", False)
        if action == "cancel":
            self.cancelled = True
            raise Cancelled()
        if apply_all:
            self.sticky[kind] = action
        return action

    def copy_file(self, src, target):
        part = target + ".folderion-part"
        copied = 0
        try:
            with open(src, "rb") as reader, open(part, "wb") as writer:
                hide_file(part)
                while True:
                    self.check()
                    block = reader.read(CHUNK)
                    if not block:
                        break
                    writer.write(block)
                    copied += len(block)
                    self.done += len(block)
            mirror_attributes(src, part)
            force_replace(part, target)
        except BaseException:
            self.done -= copied
            try:
                os.remove(part)
            except OSError:
                pass
            raise
        self.files_done += 1

    def do_file(self, src, target):
        try:
            size = os.path.getsize(src)
        except OSError:
            size = 0
        if self.mode == "move":
            try:
                force_replace(src, target)
            except OSError:
                pass
            else:
                self.done += size
                self.files_done += 1
                return
        self.copy_file(src, target)
        if self.mode == "move":
            remove_path(src)

    def do_dir(self, src, target, merging, fresh_parent):
        if not merging:
            if self.mode == "move":
                try:
                    os.rename(src, target)
                except OSError:
                    pass
                else:
                    size, count = self.stats.get(src) or tree_stats(target)
                    self.done += size
                    self.files_done += count
                    return
            os.makedirs(target)
        child_fresh = fresh_parent or not merging
        for name, child, is_dir in children(src):
            self.check()
            try:
                self.handle(child, target, name, False, child_fresh)
            except Cancelled:
                raise
            except Exception as error:
                self.fail(child, error)
        mirror_attributes(src, target)
        if self.mode == "move":
            try:
                os.rmdir(src)
            except OSError:
                pass

    def handle(self, src, dst_dir, name, top, fresh_parent):
        self.check()
        name = name or os.path.basename(src.rstrip("\\/"))
        if not name:
            raise OSError("Цей елемент не можна обробити")
        is_dir = os.path.isdir(src)
        target = os.path.join(dst_dir, name)
        if top and is_dir and (norm(dst_dir) + os.sep).startswith(norm(src) + os.sep):
            raise OSError("Не можна вставити папку саму в себе")
        replaced = False
        merging = False
        if norm(src) == norm(target):
            if self.mode == "move":
                self.skip(src)
                return src
            target = os.path.join(dst_dir, unique_name(dst_dir, name, is_dir, "copy"))
        elif os.path.lexists(target):
            action = self.resolve(src, target, dst_dir, is_dir)
            if action == "skip":
                self.skip(src)
                return None
            if action == "both":
                target = os.path.join(dst_dir, unique_name(dst_dir, name, is_dir, "both"))
            elif action == "merge":
                merging = True
            elif action == "replace":
                replaced = True
        self.current = os.path.basename(target)
        if is_dir:
            if not merging and not fresh_parent:
                self.made.append({"src": src, "dst": target, "replaced": False})
            self.do_dir(src, target, merging, fresh_parent)
        else:
            self.do_file(src, target)
            if not fresh_parent:
                self.made.append({"src": src, "dst": target, "replaced": replaced})
        return target

    def archive_members(self):
        for src, dst_dir, name in self.items:
            base = os.path.basename(src.rstrip("\\/")) or src
            if os.path.isdir(src):
                yield src, base, True
                stack = [(src, base)]
                while stack:
                    current, arc = stack.pop()
                    try:
                        listing = children(current)
                    except OSError as error:
                        self.fail(current, error)
                        continue
                    for child_name, child, is_dir in listing:
                        child_arc = arc + "/" + child_name
                        yield child, child_arc, is_dir
                        if is_dir:
                            stack.append((child, child_arc))
            else:
                yield src, base, False

    def write_zip(self, tmp):
        with zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED, allowZip64=True) as archive:
            hide_file(tmp)
            for path, arc, is_dir in self.archive_members():
                self.check()
                self.current = arc
                try:
                    info = zipfile.ZipInfo.from_file(path, arc, strict_timestamps=False)
                    if is_dir:
                        archive.writestr(info, b"")
                        continue
                    info.compress_type = zipfile.ZIP_DEFLATED
                    with open(path, "rb") as reader, archive.open(info, "w", force_zip64=info.file_size > 0x7FFFFFFF) as writer:
                        while True:
                            self.check()
                            block = reader.read(CHUNK)
                            if not block:
                                break
                            writer.write(block)
                            self.done += len(block)
                    self.files_done += 1
                except Cancelled:
                    raise
                except OSError as error:
                    self.fail(path, error)

    def write_tar(self, tmp):
        with tarfile.open(tmp, "w") as archive:
            hide_file(tmp)
            for path, arc, is_dir in self.archive_members():
                self.check()
                self.current = arc
                try:
                    info = archive.gettarinfo(path, arc)
                    if info is None:
                        continue
                    if info.isreg():
                        with open(path, "rb") as reader:
                            archive.addfile(info, CountingReader(reader, self))
                        self.files_done += 1
                    else:
                        archive.addfile(info)
                except Cancelled:
                    raise
                except OSError as error:
                    self.fail(path, error)

    def write_7z(self, tmp):
        if py7zr:
            with py7zr.SevenZipFile(tmp, "w") as archive:
                for src, dst_dir, name in self.items:
                    self.check()
                    base = os.path.basename(src.rstrip("\\/")) or src
                    self.current = base
                    try:
                        archive.write(src, base)
                    except Exception as error:
                        self.fail(src, error)
                    size, count = self.stat_of(src)
                    self.done += size
                    self.files_done += count
            return
        command = [sevenzip_command(), "a", "-t7z", "-y", tmp] + [src for src, dst_dir, name in self.items]
        process = subprocess.Popen(command, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
        while process.poll() is None:
            if self.cancelled:
                process.terminate()
                process.wait()
                raise Cancelled()
            time.sleep(0.2)
        if process.returncode not in (0, 1):
            raise OSError("7-Zip завершився з помилкою (код %d)" % process.returncode)
        self.done = self.total
        self.files_done = self.files_total

    def make_archive(self):
        extensions = {"zip": ".zip", "7z": ".7z", "tar": ".tar"}
        first = self.items[0][0].rstrip("\\/")
        if len(self.items) == 1:
            base = os.path.basename(first)
            stem = base if os.path.isdir(first) else (os.path.splitext(base)[0] or base)
        else:
            stem = os.path.basename(self.dest.rstrip("\\/")) or "Архів"
        name = stem + extensions[self.archive_kind]
        if os.path.lexists(os.path.join(self.dest, name)):
            name = unique_name(self.dest, name, False, "both")
        target = os.path.join(self.dest, name)
        tmp = os.path.join(self.dest, ".folderion-" + name)
        self.current = name
        try:
            if self.archive_kind == "zip":
                self.write_zip(tmp)
            elif self.archive_kind == "tar":
                self.write_tar(tmp)
            else:
                self.write_7z(tmp)
            self.check()
            os.replace(tmp, target)
        except BaseException:
            try:
                os.remove(tmp)
            except OSError:
                pass
            raise
        self.selected.append(target)
        UNDO_STACK.append({"mode": "create", "path": target, "is_dir": False, "size": os.path.getsize(target)})
        del UNDO_STACK[:-50]

    def prepare_extract(self):
        try:
            rows = read_archive_index(self.items[0][0])
        except Exception:
            return
        for name, is_dir, size, mtime in rows:
            if not is_dir and self.wanted(name):
                self.total += size
                self.files_total += 1

    def copy_stream(self, reader, writer):
        while True:
            self.check()
            block = reader.read(CHUNK)
            if not block:
                break
            writer.write(block)
            self.done += len(block)

    def extract_zip(self, archive, root):
        with zipfile.ZipFile(archive) as handle:
            for item in handle.infolist():
                self.check()
                out = member_target(root, item.filename)
                if not out or not self.wanted(clean_member_name(item.filename)):
                    continue
                self.current = clean_member_name(item.filename)
                try:
                    if item.is_dir():
                        os.makedirs(out, exist_ok=True)
                        continue
                    os.makedirs(os.path.dirname(out), exist_ok=True)
                    with handle.open(item) as reader, open(out, "wb") as writer:
                        self.copy_stream(reader, writer)
                    self.files_done += 1
                    stamp = zip_time(item.date_time)
                    if stamp:
                        os.utime(out, (stamp, stamp))
                except Cancelled:
                    raise
                except (OSError, RuntimeError, NotImplementedError, zipfile.BadZipFile) as error:
                    self.fail(item.filename, error)

    def extract_tar(self, archive, root):
        with tarfile.open(archive) as handle:
            for member in handle:
                self.check()
                out = member_target(root, member.name)
                if not out or not self.wanted(clean_member_name(member.name)):
                    continue
                self.current = clean_member_name(member.name)
                try:
                    if member.isdir():
                        os.makedirs(out, exist_ok=True)
                    elif member.isreg():
                        os.makedirs(os.path.dirname(out), exist_ok=True)
                        with handle.extractfile(member) as reader, open(out, "wb") as writer:
                            self.copy_stream(reader, writer)
                        self.files_done += 1
                        os.utime(out, (member.mtime, member.mtime))
                except Cancelled:
                    raise
                except (OSError, tarfile.TarError) as error:
                    self.fail(member.name, error)

    def extract_7z(self, archive, root):
        if py7zr:
            with py7zr.SevenZipFile(archive) as handle:
                self.check()
                if self.members is None:
                    handle.extractall(path=root)
                else:
                    handle.extractall(path=root, targets=[n for n in handle.getnames() if self.wanted(clean_member_name(n))])
        else:
            command = [sevenzip_command(), "x", "-y", "-o" + root, archive] + (self.members or [])
            process = subprocess.Popen(command, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
            while process.poll() is None:
                if self.cancelled:
                    process.terminate()
                    process.wait()
                    raise Cancelled()
                time.sleep(0.2)
            if process.returncode not in (0, 1):
                raise OSError("7-Zip завершився з помилкою (код %d)" % process.returncode)
        self.done = self.total
        self.files_done = self.files_total

    def extract_archive(self):
        archive = self.items[0][0]
        target = self.dest
        tmp = os.path.join(os.path.dirname(target), ".folderion-" + os.path.basename(target))
        self.current = os.path.basename(target)
        if os.path.lexists(tmp):
            shutil.rmtree(tmp, ignore_errors=True)
        os.makedirs(tmp)
        try:
            kind = archive_kind(archive)
            if kind == "zip":
                self.extract_zip(archive, tmp)
            elif kind == "tar":
                self.extract_tar(archive, tmp)
            else:
                self.extract_7z(archive, tmp)
            self.check()
            os.replace(tmp, target)
        except BaseException:
            shutil.rmtree(tmp, ignore_errors=True)
            raise
        self.selected.append(target)

    def remove_item(self, path):
        if not os.path.lexists(path):
            return
        size, count = self.stat_of(path)
        self.current = os.path.basename(path.rstrip("\\/"))
        if self.mode == "trash":
            trash_path(path)
        else:
            remove_path(path)
        self.drop_info(path)
        self.done += size
        self.files_done += count

    def drop_info(self, payload):
        info = self.after.get(payload)
        if info:
            try:
                os.remove(info)
            except OSError:
                pass

    def prepare(self):
        for src, dst_dir, name in self.items:
            self.check()
            size, count = self.stat_of(src)
            self.total += size
            self.files_total += count

    def run(self):
        with JOB_LOCK:
            try:
                self.check()
                self.state = "scanning"
                if self.mode == "extract":
                    self.prepare_extract()
                else:
                    self.prepare()
                self.state = "running"
                self.started = time.monotonic()
                if self.mode == "archive":
                    self.make_archive()
                elif self.mode == "extract":
                    self.extract_archive()
                for src, dst_dir, name in ([] if self.mode in ("archive", "extract") else self.items):
                    self.check()
                    try:
                        if self.mode in ("delete", "trash"):
                            self.remove_item(src)
                        else:
                            os.makedirs(dst_dir, exist_ok=True)
                            result = self.handle(src, dst_dir, name, True, False)
                            if result:
                                self.selected.append(result)
                                self.drop_info(src)
                    except Cancelled:
                        raise
                    except Exception as error:
                        self.fail(src, error)
                self.state = "done"
            except Cancelled:
                self.state = "cancelled"
            except Exception as error:
                self.errors.append({"name": "", "error": describe_error(error)})
                self.state = "done"
            finally:
                self.conflict = None
                self.current = ""
                if self.record and self.made and self.mode in ("copy", "move"):
                    UNDO_STACK.append({"mode": self.mode, "items": list(self.made)})
                    del UNDO_STACK[:-50]
                self.finished_at = time.monotonic()
                self.finished = True


def purge_jobs():
    now = time.monotonic()
    for key in [key for key, job in JOBS.items() if job.finished and now - job.finished_at > 120]:
        JOBS.pop(key, None)


def launch(job):
    purge_jobs()
    JOBS[job.id] = job
    threading.Thread(target=job.run, daemon=True).start()
    return {"id": job.id}


def undo_summary(entry):
    mode = entry["mode"]
    if mode == "rename":
        if not os.path.lexists(entry["new"]):
            return None
        return {"kind": "rename", "old": os.path.basename(entry["old"]), "new": os.path.basename(entry["new"])}
    if mode == "create":
        if not os.path.lexists(entry["path"]):
            return None
        return {"kind": "create", "name": os.path.basename(entry["path"])}
    if mode == "copy":
        items = [item for item in entry["items"] if not item["replaced"] and os.path.lexists(item["dst"])]
        replaced = sum(1 for item in entry["items"] if item["replaced"])
    else:
        items = [item for item in entry["items"] if os.path.lexists(item["dst"])]
        replaced = 0
    if not items:
        return None
    return {
        "kind": mode,
        "count": len(items),
        "replaced": replaced,
        "names": [os.path.basename(item["dst"]) for item in items[:5]],
    }


def default_browser_command():
    import winreg
    prog_id = None
    for key in ("http", "https"):
        try:
            with winreg.OpenKey(winreg.HKEY_CURRENT_USER, r"Software\Microsoft\Windows\Shell\Associations\UrlAssociations\%s\UserChoice" % key) as handle:
                prog_id = winreg.QueryValueEx(handle, "ProgId")[0]
                break
        except OSError:
            continue
    if not prog_id:
        return None
    try:
        with winreg.OpenKey(winreg.HKEY_CLASSES_ROOT, prog_id + r"\shell\open\command") as handle:
            return winreg.QueryValueEx(handle, "")[0]
    except OSError:
        return None


def open_in_default_browser(path):
    uri = pathlib.Path(os.path.abspath(path)).as_uri()
    if IS_WINDOWS:
        try:
            template = default_browser_command()
            if template:
                quoted = '"%s"' % uri
                if "%1" in template or "%L" in template or "%*" in template:
                    line = template.replace('"%1"', quoted).replace('"%L"', quoted).replace("%1", quoted).replace("%L", quoted).replace("%*", quoted)
                else:
                    line = template + " " + quoted
                subprocess.Popen(line)
                return True
        except Exception:
            pass
    if webbrowser.open_new_tab(uri):
        return True
    if not IS_WINDOWS:
        for command in ("xdg-open", "gio"):
            found = shutil.which(command)
            if found:
                subprocess.Popen([found, "open", uri] if command == "gio" else [found, uri])
                return True
    return False


def python_command(path):
    windowed = path.lower().endswith(".pyw")
    candidates = []
    if not getattr(sys, "frozen", False):
        base = sys.executable
        if windowed:
            alt = os.path.join(os.path.dirname(base), "pythonw.exe")
            if os.path.isfile(alt):
                base = alt
        candidates.append(base)
    names = ("pythonw", "python", "py") if windowed else ("python", "py", "python3")
    for name in names:
        found = shutil.which(name)
        if found:
            candidates.append(found)
    return candidates[0] if candidates else None, windowed


def terminal_launch(args, folder):
    for terminal in ("x-terminal-emulator", "gnome-terminal", "konsole", "xfce4-terminal", "xterm"):
        found = shutil.which(terminal)
        if found:
            flag = "--" if terminal == "gnome-terminal" else "-e"
            script = '%s; echo; read -p "Натисніть Enter..." _' % " ".join(shlex.quote(item) for item in args)
            subprocess.Popen([found, flag, "bash", "-c", script], cwd=folder)
            return
    subprocess.Popen(args, cwd=folder)


def run_python_file(path):
    interpreter, windowed = python_command(path)
    if not interpreter:
        raise OSError("Python не знайдено в системі")
    folder = os.path.dirname(path)
    if IS_WINDOWS:
        if windowed:
            subprocess.Popen([interpreter, path], cwd=folder, creationflags=0x00000008)
        else:
            line = 'cmd.exe /k ""%s" "%s""' % (interpreter, path)
            subprocess.Popen(line, cwd=folder, creationflags=0x00000010)
        return
    terminal_launch([interpreter, path], folder)


def bash_command():
    found = shutil.which("bash")
    if found and not (IS_WINDOWS and found.lower().endswith("system32\\bash.exe")):
        return found
    if IS_WINDOWS:
        for base in (os.environ.get("ProgramFiles"), os.environ.get("ProgramFiles(x86)"), os.environ.get("LocalAppData")):
            if base:
                for sub in ("Git\\bin\\bash.exe", "Programs\\Git\\bin\\bash.exe"):
                    candidate = os.path.join(base, sub)
                    if os.path.isfile(candidate):
                        return candidate
        return None
    return found


def run_shell_file(path):
    folder = os.path.dirname(path)
    ext = os.path.splitext(path)[1].lower()
    if ext in (".bat", ".cmd"):
        if not IS_WINDOWS:
            raise OSError("Файли .bat і .cmd запускаються лише у Windows")
        subprocess.Popen('cmd.exe /k ""%s""' % path, cwd=folder, creationflags=0x00000010)
        return
    shell = bash_command()
    if not shell:
        raise OSError("Bash не знайдено в системі")
    if IS_WINDOWS:
        subprocess.Popen('cmd.exe /k ""%s" "%s""' % (shell, path), cwd=folder, creationflags=0x00000010)
        return
    terminal_launch([shell, path], folder)


class Api:
    def __init__(self):
        self._mode = "normal"
        self._editor_dirty = False

    def places(self):
        home = os.path.expanduser("~")
        return {
            "desktop": known_folder("B4BFCC3A-DB2C-424C-B029-7FE99A87C641", os.path.join(home, "Desktop")),
            "downloads": known_folder("374DE290-123F-4565-9164-39C4925E467B", os.path.join(home, "Downloads")),
            "documents": known_folder("FDD39AD0-238F-46AF-ADB4-6C85480369C7", os.path.join(home, "Documents")),
            "pictures": known_folder("33E28130-4E1E-4676-835A-98395C3BC3BB", os.path.join(home, "Pictures")),
            "music": known_folder("4BD8D571-6D19-48D3-BE97-422220080E43", os.path.join(home, "Music")),
            "videos": known_folder("18989B1D-99B5-455B-841C-AB7C74E4DDFC", os.path.join(home, "Videos")),
            "pc": "",
            "trash": TRASH_URI,
            "start": start_folder(),
        }

    def list_dir(self, path, show_hidden=False):
        if path == TRASH_URI:
            try:
                return {"path": TRASH_URI, "entries": list_trash(), "error": None}
            except Exception as error:
                return {"path": TRASH_URI, "entries": [], "error": "Не вдалося прочитати смітник: " + describe_error(error)}
        if not path:
            return {"path": "", "entries": list_drives(), "error": None}
        path = os.path.abspath(os.path.expandvars(os.path.expanduser(path)))
        if len(path) == 2 and path[1] == ":":
            path += "\\"
        found = split_archive(path)
        if found:
            try:
                return {"path": path, "entries": list_archive(found[0], found[1]), "error": None, "archive": found[0]}
            except Exception as error:
                return {"path": path, "entries": [], "error": "Не вдалося відкрити архів: " + describe_error(error), "archive": None}
        try:
            with os.scandir(path) as scan:
                entries = [item for item in (describe(entry, show_hidden) for entry in scan) if item]
        except Exception:
            return {"path": path, "entries": [], "error": "Не вдалося відкрити: " + path}
        entries.sort(key=lambda item: (not item["is_dir"], item["name"].casefold()))
        return {"path": path, "entries": entries, "error": None}

    def parent(self, path):
        if not path or path == TRASH_URI:
            return ""
        current = os.path.abspath(path)
        up = os.path.dirname(current)
        return "" if up == current else up

    def get_icons(self, paths):
        if not IS_WINDOWS:
            return {}
        return {path: icon_data_url(path) for path in paths}

    def media_url(self, path):
        if not MEDIA["port"]:
            return None
        return "http://127.0.0.1:%d/media?t=%s&p=%s" % (MEDIA["port"], MEDIA["token"], quote(path, safe=""))

    def open_recycle_bin(self):
        try:
            if IS_WINDOWS:
                subprocess.Popen(["explorer.exe", "shell:RecycleBinFolder"])
            else:
                subprocess.Popen(["xdg-open", "trash:///"])
            return {"ok": True}
        except Exception as error:
            return {"ok": False, "error": str(error)}

    def open_path(self, path):
        if IS_WINDOWS:
            os.startfile(path)
        else:
            subprocess.Popen(["xdg-open", path])

    def open_in_browser(self, path):
        try:
            if not os.path.isfile(path):
                return {"ok": False, "error": "Файл не знайдено."}
            if not open_in_default_browser(path):
                return {"ok": False, "error": "Не вдалося запустити браузер."}
        except Exception as error:
            return {"ok": False, "error": describe_error(error)}
        return {"ok": True}

    def run_python(self, path):
        try:
            if not os.path.isfile(path):
                return {"ok": False, "error": "Файл не знайдено."}
            run_python_file(os.path.abspath(path))
        except Exception as error:
            return {"ok": False, "error": describe_error(error)}
        return {"ok": True}

    def run_script(self, path):
        try:
            if not os.path.isfile(path):
                return {"ok": False, "error": "Файл не знайдено."}
            if os.path.splitext(path)[1].lower() not in (".bat", ".cmd", ".sh"):
                return {"ok": False, "error": "Цей тип файлу не можна запустити."}
            run_shell_file(os.path.abspath(path))
        except Exception as error:
            return {"ok": False, "error": describe_error(error)}
        return {"ok": True}

    def start_extract(self, archive):
        archive = os.path.abspath(archive)
        if not os.path.isfile(archive) or not is_archive_name(archive):
            return {"error": "Архів не знайдено."}
        if archive_kind(archive) == "7z" and not py7zr and not sevenzip_command():
            return {"error": "Для формату 7z потрібна бібліотека py7zr (pip install py7zr) або встановлений 7-Zip."}
        base = os.path.dirname(archive)
        name = archive_stem(os.path.basename(archive))
        if os.path.lexists(os.path.join(base, name)):
            name = unique_name(base, name, True, "both")
        job = Job("extract", [(archive, base, None)], os.path.join(base, name), "Видобування з архіву", False)
        return launch(job)

    def start_extract_selected(self, paths):
        found = [split_archive(os.path.abspath(path)) for path in paths or []]
        found = [item for item in found if item and item[1]]
        if not found:
            return {"error": "Елементи не знайдено в архіві."}
        archive = found[0][0]
        members = sorted({item[1] for item in found if item[0] == archive})
        if archive_kind(archive) == "7z" and not py7zr and not sevenzip_command():
            return {"error": "Для формату 7z потрібна бібліотека py7zr (pip install py7zr) або встановлений 7-Zip."}
        base = os.path.dirname(archive)
        name = archive_stem(os.path.basename(archive))
        if os.path.lexists(os.path.join(base, name)):
            name = unique_name(base, name, True, "both")
        job = Job("extract", [(archive, base, None)], os.path.join(base, name), "Видобування вибраного", False)
        job.members = members
        return launch(job)

    def open_from_archive(self, path):
        try:
            found = split_archive(os.path.abspath(path))
            if not found or not found[1]:
                return {"ok": False, "error": "Файл не знайдено в архіві."}
            folder = os.path.join(tempfile.gettempdir(), "FOLDERION-archive", uuid.uuid4().hex[:12])
            os.makedirs(folder, exist_ok=True)
            out = extract_member(found[0], found[1], folder)
            self.open_path(out)
        except Exception as error:
            return {"ok": False, "error": describe_error(error)}
        return {"ok": True}

    def new_window(self, path=None):
        if getattr(sys, "frozen", False):
            command = [sys.executable]
        else:
            command = [sys.executable, os.path.abspath(__file__)]
        if path and os.path.isdir(path):
            command.append(path)
        subprocess.Popen(command, cwd=os.path.dirname(sys.executable if getattr(sys, "frozen", False) else os.path.abspath(__file__)))

    def start_transfer(self, mode, sources, dest):
        if mode not in ("copy", "move") or not dest or not os.path.isdir(dest):
            return {"error": "Папка призначення недоступна."}
        items = [(path, dest, None) for path in sources if os.path.lexists(path)]
        if not items:
            return {"error": "Вихідні елементи більше не існують."}
        title = "Копіювання" if mode == "copy" else "Переміщення"
        return launch(Job(mode, items, dest, title))

    def create_item(self, folder, kind):
        names = {"folder": "Нова папка", "file": "Новий файл.txt", "archive": "Новий архів.zip"}
        if kind not in names or not folder or not os.path.isdir(folder):
            return {"ok": False, "error": "Папка недоступна."}
        is_dir = kind == "folder"
        name = names[kind]
        if os.path.lexists(os.path.join(folder, name)):
            name = unique_name(folder, name, is_dir, "both")
        path = os.path.join(folder, name)
        try:
            if is_dir:
                os.mkdir(path)
            elif kind == "file":
                open(path, "xb").close()
            else:
                zipfile.ZipFile(path, "x").close()
            size = 0 if is_dir else os.path.getsize(path)
        except OSError as error:
            return {"ok": False, "error": describe_error(error)}
        UNDO_STACK.append({"mode": "create", "path": path, "is_dir": is_dir, "size": size})
        del UNDO_STACK[:-50]
        return {"ok": True, "path": path}

    def load_pins(self):
        pins = load_settings().get("pinned")
        return [item for item in pins if isinstance(item, str) and item] if isinstance(pins, list) else []

    def pin_kinds(self, paths):
        kinds = {}
        for path in paths or []:
            if not isinstance(path, str):
                continue
            kinds[path] = "dir" if os.path.isdir(path) else ("file" if os.path.lexists(path) else "dir")
        return kinds

    def save_pins(self, paths):
        settings = load_settings()
        settings["pinned"] = [item for item in (paths or []) if isinstance(item, str) and item]
        try:
            save_settings(settings)
        except OSError as error:
            return {"ok": False, "error": describe_error(error)}
        return {"ok": True}

    def start_archive(self, kind, sources, dest):
        if kind not in ("zip", "7z", "tar") or not dest or not os.path.isdir(dest):
            return {"error": "Папка призначення недоступна."}
        if kind == "7z" and not py7zr and not sevenzip_command():
            return {"error": "Для формату 7z потрібна бібліотека py7zr (pip install py7zr) або встановлений 7-Zip."}
        items = [(path, dest, None) for path in sources if os.path.lexists(path)]
        if not items:
            return {"error": "Вибрані елементи більше не існують."}
        job = Job("archive", items, dest, "Стиснення до " + kind.upper(), False)
        job.archive_kind = kind
        return launch(job)

    def copy_text(self, text):
        try:
            set_clipboard_text(text)
        except Exception as error:
            return {"ok": False, "error": describe_error(error)}
        return {"ok": True}

    def start_delete(self, paths, permanent):
        items = [(path, "", None) for path in paths if os.path.lexists(path)]
        if not items:
            return {"error": "Вибрані елементи більше не існують."}
        if permanent:
            return launch(Job("delete", items, "", "Остаточне видалення", False))
        return launch(Job("trash", items, "", "Переміщення до кошика", False))

    def trash_items(self, payloads):
        known = {item["path"]: item for item in list_trash()}
        return [known[path] for path in payloads if path in known]

    def start_restore(self, payloads):
        items = self.trash_items(payloads)
        if not items:
            return {"error": "Вибрані елементи вже відсутні у смітнику."}
        job = Job("move", [(item["path"], os.path.dirname(item["original"]), os.path.basename(item["original"])) for item in items], "", "Відновлення зі смітника", False)
        job.after = {item["path"]: item["info"] for item in items}
        job.restore = True
        return launch(job)

    def start_purge(self, payloads):
        items = self.trash_items(payloads)
        if not items:
            return {"error": "Вибрані елементи вже відсутні у смітнику."}
        job = Job("delete", [(item["path"], "", None) for item in items], "", "Остаточне видалення", False)
        job.after = {item["path"]: item["info"] for item in items}
        return launch(job)

    def start_restore_all(self):
        return self.start_restore([item["path"] for item in list_trash()])

    def start_empty_trash(self):
        return self.start_purge([item["path"] for item in list_trash()])

    def job_status(self, job_id):
        job = JOBS.get(int(job_id))
        return job.snapshot() if job else None

    def job_answer(self, job_id, action, apply_all):
        job = JOBS.get(int(job_id))
        return job.answer_conflict(action, apply_all) if job else False

    def job_cancel(self, job_id):
        job = JOBS.get(int(job_id))
        if job:
            job.cancel()

    def rename(self, path, new_name):
        name = (new_name or "").strip()
        problem = check_name(name)
        if problem:
            return {"ok": False, "error": problem}
        target = os.path.join(os.path.dirname(path), name)
        if target == path:
            return {"ok": True, "path": path}
        if norm(target) != norm(path) and os.path.lexists(target):
            return {"ok": False, "error": "Елемент з іменем «%s» уже існує в цій папці." % name}
        try:
            os.rename(path, target)
        except OSError as error:
            return {"ok": False, "error": describe_error(error)}
        UNDO_STACK.append({"mode": "rename", "old": path, "new": target})
        del UNDO_STACK[:-50]
        return {"ok": True, "path": target}

    def undo_peek(self):
        while UNDO_STACK:
            info = undo_summary(UNDO_STACK[-1])
            if info:
                return info
            UNDO_STACK.pop()
        return None

    def undo_start(self):
        if not self.undo_peek():
            return {"error": "Немає дій для скасування."}
        entry = UNDO_STACK.pop()
        if entry["mode"] == "rename":
            try:
                if os.path.lexists(entry["old"]) and norm(entry["old"]) != norm(entry["new"]):
                    raise OSError("Елемент з іменем «%s» уже існує." % os.path.basename(entry["old"]))
                os.rename(entry["new"], entry["old"])
            except OSError as error:
                UNDO_STACK.append(entry)
                return {"error": describe_error(error)}
            return {"immediate": True, "path": entry["old"], "note": "Перейменування скасовано"}
        if entry["mode"] == "create":
            path = entry["path"]
            try:
                if entry["is_dir"]:
                    if os.listdir(path):
                        raise OSError("Папка вже не порожня, тому її не видалено.")
                    os.rmdir(path)
                elif os.path.getsize(path) == entry["size"]:
                    os.remove(path)
                else:
                    raise OSError("Файл уже змінено, тому його не видалено.")
            except OSError as error:
                return {"error": describe_error(error)}
            return {"immediate": True, "path": "", "note": "Створення скасовано"}
        if entry["mode"] == "copy":
            items = [(item["dst"], "", None) for item in entry["items"] if not item["replaced"] and os.path.lexists(item["dst"])]
            return launch(Job("delete", items, "", "Скасування копіювання", False))
        items = [
            (item["dst"], os.path.dirname(item["src"]), os.path.basename(item["src"]))
            for item in entry["items"]
            if os.path.lexists(item["dst"])
        ]
        return launch(Job("move", items, items[0][1], "Скасування переміщення", False))

    def minimize(self):
        webview.windows[0].minimize()

    def apply_mode(self, mode, notify=True):
        left, top, width, height = work_area()
        if mode == "max":
            place(left, top, width, height)
        elif mode == "left":
            place(left, top, width // 2, height)
        elif mode == "right":
            place(left + width // 2, top, width - width // 2, height)
        else:
            place(*centered_rect())
        self._mode = mode
        if notify:
            try:
                webview.windows[0].evaluate_js("setMaxIcon(%s)" % ("true" if mode == "max" else "false"))
            except Exception:
                pass

    def snap(self, direction):
        mode = self._mode
        if direction == "up":
            target = "max"
        elif direction == "down":
            if mode == "normal":
                webview.windows[0].minimize()
                return
            target = "normal"
        elif direction == "left":
            target = "normal" if mode == "right" else "left"
        else:
            target = "normal" if mode == "left" else "right"
        self.apply_mode(target)

    def toggle_maximize(self):
        if not IS_WINDOWS:
            webview.windows[0].toggle_fullscreen()
            return False
        self.apply_mode("normal" if self._mode == "max" else "max", notify=False)
        return self._mode == "max"

    def set_editor_dirty(self, flag):
        self._editor_dirty = bool(flag)

    def read_text(self, path):
        try:
            if not os.path.isfile(path):
                return {"ok": False, "error": "Файл не знайдено."}
            size = os.path.getsize(path)
            if size > EDIT_LIMIT:
                return {"ok": False, "error": "Файл завеликий для редактора (понад 2 МБ)."}
            with open(path, "rb") as handle:
                data = handle.read()
            text, encoding = decode_text(data)
        except ValueError as error:
            return {"ok": False, "error": str(error)}
        except OSError as error:
            return {"ok": False, "error": describe_error(error)}
        eol = "\r\n" if "\r\n" in text else "\n"
        text = text.replace("\r\n", "\n").replace("\r", "\n")
        return {"ok": True, "text": text, "encoding": encoding, "eol": eol, "size": size}

    def write_text(self, path, text, eol, encoding):
        if eol not in ("\n", "\r\n") or encoding not in ("utf-8", "utf-8-sig", "utf-16", "cp1251"):
            return {"ok": False, "error": "Невідомий формат файлу."}
        tmp = path + ".folderion-part"
        try:
            data = (text or "").replace("\n", eol).encode(encoding, errors="replace" if encoding == "cp1251" else "strict")
            with open(tmp, "wb") as handle:
                handle.write(data)
            if os.path.exists(path):
                mirror_attributes(path, tmp)
            force_replace(tmp, path)
        except (OSError, UnicodeError) as error:
            try:
                os.remove(tmp)
            except OSError:
                pass
            return {"ok": False, "error": describe_error(error)}
        return {"ok": True}

    def close(self):
        if self._editor_dirty:
            try:
                webview.windows[0].evaluate_js("warnDirtyClose()")
            except Exception:
                pass
            return
        webview.windows[0].destroy()


class KbdHookStruct(ctypes.Structure):
    _fields_ = [
        ("vkCode", wintypes.DWORD),
        ("scanCode", wintypes.DWORD),
        ("flags", wintypes.DWORD),
        ("time", wintypes.DWORD),
        ("dwExtraInfo", ctypes.c_size_t),
    ]


HOOK_REFS = []


def install_snap_hook(api, hwnd):
    user32 = ctypes.windll.user32
    kernel32 = ctypes.windll.kernel32
    hook_proc = ctypes.WINFUNCTYPE(ctypes.c_ssize_t, ctypes.c_int, wintypes.WPARAM, wintypes.LPARAM)
    user32.CallNextHookEx.argtypes = [ctypes.c_void_p, ctypes.c_int, wintypes.WPARAM, wintypes.LPARAM]
    user32.CallNextHookEx.restype = ctypes.c_ssize_t
    user32.SetWindowsHookExW.argtypes = [ctypes.c_int, hook_proc, ctypes.c_void_p, wintypes.DWORD]
    user32.SetWindowsHookExW.restype = ctypes.c_void_p
    user32.GetAsyncKeyState.argtypes = [ctypes.c_int]
    user32.GetAsyncKeyState.restype = ctypes.c_short
    user32.GetForegroundWindow.restype = ctypes.c_void_p
    kernel32.GetModuleHandleW.argtypes = [wintypes.LPCWSTR]
    kernel32.GetModuleHandleW.restype = ctypes.c_void_p
    directions = {0x25: "left", 0x26: "up", 0x27: "right", 0x28: "down"}
    swallowed = set()

    def procedure(code, wparam, lparam):
        if code == 0:
            data = ctypes.cast(lparam, ctypes.POINTER(KbdHookStruct)).contents
            vk = data.vkCode
            if vk in directions and not data.flags & 0x10:
                if wparam in (0x100, 0x104):
                    if vk in swallowed:
                        return 1
                    win = (user32.GetAsyncKeyState(0x5B) | user32.GetAsyncKeyState(0x5C)) & 0x8000
                    if win and user32.GetForegroundWindow() == hwnd:
                        swallowed.add(vk)
                        user32.keybd_event(0xE8, 0, 0, 0)
                        user32.keybd_event(0xE8, 0, 2, 0)
                        threading.Thread(target=api.snap, args=(directions[vk],), daemon=True).start()
                        return 1
                elif vk in swallowed:
                    swallowed.discard(vk)
                    return 1
        return user32.CallNextHookEx(None, code, wparam, lparam)

    def loop():
        callback = hook_proc(procedure)
        HOOK_REFS.append(callback)
        handle = user32.SetWindowsHookExW(13, callback, kernel32.GetModuleHandleW(None), 0)
        if not handle:
            return
        message = wintypes.MSG()
        while user32.GetMessageW(ctypes.byref(message), None, 0, 0) > 0:
            user32.TranslateMessage(ctypes.byref(message))
            user32.DispatchMessageW(ctypes.byref(message))

    threading.Thread(target=loop, daemon=True).start()


def on_start(api):
    window = webview.windows[0]
    window.events.shown.wait(10)
    place(*centered_rect())
    try:
        hwnd = int(window.native.Handle.ToInt64())
        install_snap_hook(api, hwnd)
    except Exception:
        pass


def enable_dpi_awareness():
    try:
        ctypes.windll.shcore.SetProcessDpiAwareness(2)
    except Exception:
        try:
            ctypes.windll.user32.SetProcessDPIAware()
        except Exception:
            pass


def main():
    base = getattr(sys, "_MEIPASS", os.path.dirname(os.path.abspath(__file__)))
    if IS_WINDOWS:
        enable_dpi_awareness()
    start_media_server()
    shutil.rmtree(os.path.join(tempfile.gettempdir(), "FOLDERION-archive"), ignore_errors=True)
    api = Api()
    window = webview.create_window(
        "FOLDERION",
        os.path.join(base, "index.html"),
        js_api=api,
        width=1100,
        height=680,
        frameless=True,
        easy_drag=False,
        background_color="#121214",
    )
    def on_closing():
        if api._editor_dirty:
            threading.Thread(target=lambda: window.evaluate_js("warnDirtyClose()"), daemon=True).start()
            return False
        return True

    try:
        window.events.closing += on_closing
    except Exception:
        pass
    options = {"private_mode": False, "storage_path": os.path.join(data_dir(), "webview")}
    try:
        if IS_WINDOWS:
            webview.start(on_start, api, **options)
        else:
            webview.start(**options)
    except TypeError:
        if IS_WINDOWS:
            webview.start(on_start, api)
        else:
            webview.start()


if __name__ == "__main__":
    main()