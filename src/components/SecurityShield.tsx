import { useEffect } from "react";

export default function SecurityShield() {
  useEffect(() => {
    // Disable right-click
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    // Disable keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // F12
      if (e.key === "F12") { e.preventDefault(); return; }
      // Ctrl+Shift+I / Ctrl+Shift+J / Ctrl+Shift+C
      if (e.ctrlKey && e.shiftKey && ["I", "J", "C"].includes(e.key.toUpperCase())) { e.preventDefault(); return; }
      // Ctrl+U (view source)
      if (e.ctrlKey && e.key.toUpperCase() === "U") { e.preventDefault(); return; }
      // Ctrl+S (save)
      if (e.ctrlKey && e.key.toUpperCase() === "S") { e.preventDefault(); return; }
      // Ctrl+Shift+K (Firefox console)
      if (e.ctrlKey && e.shiftKey && e.key.toUpperCase() === "K") { e.preventDefault(); return; }
    };

    // Disable copy/paste/cut
    const handleCopy = (e: ClipboardEvent) => e.preventDefault();

    // Disable text selection via CSS
    document.body.style.userSelect = "none";
    document.body.style.webkitUserSelect = "none";

    // Disable drag
    const handleDragStart = (e: DragEvent) => e.preventDefault();

    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("copy", handleCopy);
    document.addEventListener("cut", handleCopy);
    document.addEventListener("dragstart", handleDragStart);

    // Check devtools periodically
    const devToolsInterval = setInterval(detectDevTools, 2000);

    // Console warning
    console.log(
      "%c⛔ DỪNG LẠI!",
      "color: red; font-size: 40px; font-weight: bold;"
    );
    console.log(
      "%cĐây là tính năng dành cho nhà phát triển. Nếu ai đó bảo bạn sao chép/dán thứ gì đó ở đây, đó là lừa đảo.",
      "font-size: 16px; color: #ff8c00;"
    );

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("cut", handleCopy);
      document.removeEventListener("dragstart", handleDragStart);
      clearInterval(devToolsInterval);
      document.body.style.userSelect = "";
      document.body.style.webkitUserSelect = "";
    };
  }, []);

  return null;
}
