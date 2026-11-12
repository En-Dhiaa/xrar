# XRAR — Integrated Professional PDF Viewer Architecture (§83–§115)

## 1. Overview & Objectives

In accordance with Master Specification §§83–115, **XRAR** incorporates a full-featured, high-performance, offline-first PDF reader comparable to Foxit PDF Reader and Adobe Acrobat.

The PDF viewer is integrated directly into the XRAR desktop runtime without external browser windows, dev servers, or cloud dependencies.

When a user double-clicks any `.pdf` associated with XRAR, or opens a PDF from within the XRAR File Manager or Windows Explorer context menu, XRAR immediately launches into the dedicated PDF Viewer workspace.

---

## 2. Workspace Layout

The PDF Viewer workspace consists of five integrated panels:

```
+----------------------------------------------------------------------------------------------------+
|  Tabs Bar: [ 📄 annual_report_2026.pdf ✕ ] [ 📄 invoice_8842.pdf ✕ ] [ + ]                        |
+----------------------------------------------------------------------------------------------------+
|  Top Toolbar: Open | Save As | Print | 🔍 Find | ➖ Zoom [ 100% ▾ ] ➕ | Fit | Width | ↺ ↻ | Full | Exit |
+------------------------------------+---------------------------------------------------------------+
|  Left Sidebar (Collapsible)        |  Main Viewport (High-DPI Canvas + Text Selection Layer)        |
|  - [Thumbnails] [Outline] [Search] |                                                               |
|                                    |  +---------------------------------------------------------+  |
|  [p.1 Thumbnail]                   |  |                                                         |  |
|  [p.2 Thumbnail]                   |  |  XRAR Extreme Compression & Professional PDF Reader     |  |
|  [p.3 Thumbnail]                   |  |                                                         |  |
|  ...                               |  |  [Selectable and Copyable Text Layer: Ctrl+C]           |  |
|                                    |  +---------------------------------------------------------+  |
+------------------------------------+---------------------------------------------------------------+
|  Status Bar: Page 1 / 48  |  100% Zoom  |  annual_report_2026.pdf (1.42 MB)                        |
+----------------------------------------------------------------------------------------------------+
```

---

## 3. Component Architecture

All PDF viewer components are organized under `frontend/src/components/pdf/`:

| Component | File Path | Responsibilities |
|---|---|---|
| **PdfViewerWorkspace** | `frontend/src/components/pdf/PdfViewerWorkspace.tsx` | Master orchestrator, multi-tab state, PDF.js document loading, async thumbnail generation, scanned document detection, and drag & drop. |
| **PdfTabsBar** | `frontend/src/components/pdf/PdfTabsBar.tsx` | Multi-document tab management with close buttons, active tab indicators, and new tab triggers. |
| **PdfToolbar** | `frontend/src/components/pdf/PdfToolbar.tsx` | Reading controls: Open, Save As, Print, Search, Zoom presets (25%–400%), Fit Page, Fit Width, 90° rotation, view modes, fullscreen, and exit. |
| **PdfSidebar** | `frontend/src/components/pdf/PdfSidebar.tsx` | Multi-mode sidebar with 4 tabs: Thumbnails, Bookmarks/Outline tree, Search Results list with snippet highlights, and Attachments. |
| **PdfCanvasViewer** | `frontend/src/components/pdf/PdfCanvasViewer.tsx` | High-DPI canvas renderer with HiDPI backing scale (`window.devicePixelRatio`), transparent DOM text selection layer for `Ctrl+C` copying, and contextual action menu (Copy, Search Web, Highlight, Comment). |
| **PdfSearchBar** | `frontend/src/components/pdf/PdfSearchBar.tsx` | Floating `Ctrl+F` search widget with match counter ("match 3 of 15"), previous/next match jumping, case-sensitivity toggle, and OCR prompt for scanned documents. |
| **PdfStatusBar** | `frontend/src/components/pdf/PdfStatusBar.tsx` | Document status: current page, total pages, jump-to-page direct input, zoom percentage, and file size. |
| **WindowsIntegrationModal** | `frontend/src/components/pdf/WindowsIntegrationModal.tsx` | Windows Shell integration diagnostics and 1-click registration/repair for File Associations, Preview Pane (`IPreviewHandler`), and Thumbnail Provider (`IThumbnailProvider`). |

---

## 4. Reading Modes & Navigation

### Reading Modes
- **Continuous Mode**: Smooth vertical scrolling through all pages.
- **Single Page Mode**: Discrete page presentation.
- **Two-Page Mode**: Facing pages spread (book layout).
- **Two-Page Continuous Mode**: Facing pages spread with smooth continuous scrolling.

### Zoom Controls
- **Presets**: 25%, 50%, 75%, 100%, 125%, 150%, 200%, 300%, 400%.
- **Fit Width**: Automatically scales the page to fill the horizontal viewport width.
- **Fit Page**: Scales the entire page to fit within the visible viewport height.
- **Ctrl + Mouse Wheel**: Dynamic smooth zooming.

### Keyboard Shortcuts
- `PageUp` / `PageDown`: Previous / Next page.
- `Home` / `End`: Jump to first / last page of the document.
- `Arrow Up` / `Arrow Down`: Scroll view.
- `Ctrl + F`: Toggle in-document search bar.
- `Ctrl + C`: Copy selected text to Windows clipboard.
- `Ctrl + P`: Open print dialog.
- `Escape`: Close active modal or exit fullscreen.

---

## 5. Text Selection, Copying & Search

### High-DPI Canvas & Selection Layer
- The rendering pipeline uses a dual-layer approach:
  1. **Canvas Layer**: Rendered at physical pixel dimensions scaled by `window.devicePixelRatio` for razor-sharp text and graphics on 4K/retina displays.
  2. **Text Layer**: Positioned directly on top of the canvas with font metrics matched to the PDF text stream, rendered with transparent color and `cursor: text`.
- Users can naturally click and drag to select single or multi-line text blocks.
- Pressing `Ctrl+C` or right-clicking and selecting **Copy** places clean Unicode text onto the Windows clipboard.

### Fast Local Search
- Searches all document pages asynchronously in the background.
- Matches are highlighted across pages with amber background badges.
- Match counter provides instant totals: `Result 4 of 28`.
- If the document contains zero text objects (scanned document), the search bar displays an OCR notice: *"Scanned document detected — Run OCR to make this document searchable."*

---

## 6. Windows Shell Integration

### File Associations
- Registered under `HKCU\Software\Classes\.pdf` and `HKCU\Software\Classes\XRAR.PdfDocument`.
- Clicking any `.pdf` in Windows Explorer opens XRAR directly into the PDF Viewer workspace.

### Explorer Context Menu
- Right-clicking any `.pdf` file in Windows Explorer displays:
  `Open in XRAR PDF Reader` with the XRAR branded icon.

### Preview Handler & Thumbnail Provider
- Registered keys under `HKCU\Software\Classes\SystemFileAssociations\.pdf\shellex`:
  - Preview Pane: `{8895b1c6-b41f-4c1c-a562-0d564250836f}`
  - Thumbnail Provider: `{e357fccd-a995-4576-b01f-234630154e96}`
- Users can diagnose and repair shell associations anytime via the **Windows Shell Integration** dialog inside the viewer toolbar.

---

## 7. IPC Commands

The desktop backend (`apps/desktop/src/main.rs`) exposes native typed IPC commands for the PDF Viewer:

```rust
#[tauri::command]
fn read_pdf_bytes(path: String) -> Result<Vec<u8>, String>;

#[tauri::command]
fn save_pdf_bytes(path: String, data: Vec<u8>) -> Result<(), String>;

#[tauri::command]
fn browse_pdf_file() -> Option<String>;

#[tauri::command]
fn browse_save_pdf() -> Option<String>;

#[tauri::command]
fn register_pdf_associations() -> Result<(), String>;

#[tauri::command]
fn check_pdf_integration_status() -> Result<PdfIntegrationStatus, String>;
```

---

## 8. Offline & Security Guarantees

1. **100% Offline**: Rendering is executed entirely in-process using the local bundled PDF worker (`dist/assets/pdf.worker-*.mjs`).
2. **Zero Network Calls**: No requests to external servers, CDNs, or telemetry endpoints.
3. **Memory Safety**: Backed by Rust filesystem and IPC boundaries with zero memory leaks.
