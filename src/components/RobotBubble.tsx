import { useRef, useState, ReactNode } from "react";

interface RobotBubbleProps {
  robotImage: string;
  robotAlt?: string;
  children: ReactNode;
  visible: boolean;
  onToggle: (visible: boolean) => void;
  accentColor?: string; // e.g. "#ffd700", "#e0b0ff", "#00ff99"
  glowColor?: string; // for the border glow
  position: { x: number; y: number };
  onPositionChange: (pos: { x: number; y: number }) => void;
  bubbleWidth?: string;
}

export default function RobotBubble({
  robotImage,
  robotAlt = "Robot",
  children,
  visible,
  onToggle,
  accentColor = "#ffd700",
  glowColor,
  position,
  onPositionChange,
  bubbleWidth = "min(175px, calc(100vw - 76px))",
}: RobotBubbleProps) {
  const dragState = useRef({ dragging: false, startX: 0, startY: 0, startLeft: 0, startTop: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const glow = glowColor || accentColor;

  const onPointerDown = (e: React.PointerEvent) => {
    dragState.current = { dragging: true, startX: e.clientX, startY: e.clientY, startLeft: position.x, startTop: position.y };
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragState.current.dragging) return;
    onPositionChange({
      x: Math.max(0, Math.min(window.innerWidth - 230, dragState.current.startLeft + (e.clientX - dragState.current.startX))),
      y: Math.max(0, Math.min(window.innerHeight - 190, dragState.current.startTop + (e.clientY - dragState.current.startY))),
    });
  };
  const onPointerUp = (e: React.PointerEvent) => {
    dragState.current.dragging = false;
    setIsDragging(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  return (
    <>
      <style>{`
        @keyframes rb-float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-4px); } }
        @keyframes rb-glow-pulse { 0%, 100% { box-shadow: 0 0 8px ${glow}40, 0 0 20px ${glow}15; } 50% { box-shadow: 0 0 15px ${glow}60, 0 0 30px ${glow}25; } }
        @keyframes rb-bubble-in { 0% { opacity: 0; transform: scale(0.7) translateX(-8px); } 100% { opacity: 1; transform: scale(1) translateX(0); } }
        @keyframes rb-shine { 0% { left: -100%; } 100% { left: 200%; } }
        @keyframes rb-border-flow { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        @keyframes rb-reopen-pulse { 0%, 100% { transform: scale(1); box-shadow: 0 0 10px ${glow}50; } 50% { transform: scale(1.1); box-shadow: 0 0 20px ${glow}80; } }
      `}</style>

      <div
        className="fixed z-[9999] flex items-start select-none"
        style={{ left: position.x, top: position.y, touchAction: "none", maxWidth: "calc(100vw - 8px)" }}
      >
        {/* Robot avatar with float animation */}
        <div
          className="relative cursor-move flex-shrink-0"
          style={{ animation: isDragging ? "none" : "rb-float 3s ease-in-out infinite" }}
        >
          {/* Glow ring behind robot */}
          <div
            className="absolute inset-[-3px] rounded-full"
            style={{
              background: `linear-gradient(135deg, ${accentColor}, ${glow}, ${accentColor})`,
              backgroundSize: "200% 200%",
              animation: "rb-border-flow 3s ease infinite",
              filter: "blur(2px)",
              opacity: 0.7,
            }}
          />
          <img
            src={robotImage}
            alt={robotAlt}
            className="w-[44px] h-[44px] rounded-full relative z-10"
            style={{
              border: `2px solid ${accentColor}`,
              animation: "rb-glow-pulse 2s ease-in-out infinite",
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          />
          {/* Online indicator */}
          <div
            className="absolute bottom-0 right-0 w-3 h-3 rounded-full z-20"
            style={{
              background: "#00ff99",
              border: "2px solid rgba(0,0,0,0.8)",
              boxShadow: "0 0 6px #00ff99",
            }}
          />
        </div>

        {/* Chat bubble with entrance animation */}
        {visible && (
          <div
            className="ml-1.5 relative overflow-hidden"
            style={{
              animation: "rb-bubble-in 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
              width: bubbleWidth,
            }}
          >
            {/* Animated gradient border */}
            <div
              className="absolute inset-0 rounded-xl"
              style={{
                padding: "1px",
                background: `linear-gradient(135deg, ${accentColor}60, ${glow}30, ${accentColor}60, transparent)`,
                backgroundSize: "300% 300%",
                animation: "rb-border-flow 4s ease infinite",
                borderRadius: 12,
              }}
            >
              <div className="w-full h-full rounded-xl" style={{ background: "rgba(8,8,15,0.92)" }} />
            </div>

            {/* Content */}
            <div
              className="relative z-10"
              style={{
                background: "rgba(8,8,15,0.92)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                padding: "8px 10px",
                borderRadius: 12,
                fontSize: 10,
                color: "#fff",
              }}
            >
              {/* Shine sweep effect */}
              <div
                className="absolute top-0 w-[40%] h-full pointer-events-none"
                style={{
                  background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent)",
                  animation: "rb-shine 5s ease-in-out infinite",
                }}
              />

              {children}

              {/* Close button */}
              <div
                className="absolute top-1.5 right-2 cursor-pointer text-xs transition-all hover:scale-125"
                style={{ color: "rgba(255,255,255,0.35)" }}
                onClick={() => onToggle(false)}
              >
                ✕
              </div>
            </div>
          </div>
        )}

        {/* Reopen button with pulse */}
        {!visible && (
          <div
            onClick={() => onToggle(true)}
            className="ml-2 w-9 h-9 rounded-full flex items-center justify-center cursor-pointer text-base"
            style={{
              background: `linear-gradient(135deg, rgba(0,0,0,0.9), rgba(20,10,40,0.9))`,
              border: `1.5px solid ${accentColor}`,
              color: accentColor,
              animation: "rb-reopen-pulse 2s ease-in-out infinite",
            }}
          >
            💬
          </div>
        )}
      </div>
    </>
  );
}
