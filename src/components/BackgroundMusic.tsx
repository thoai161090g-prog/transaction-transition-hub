import { useState, useRef, useEffect } from "react";

const MUSIC_URL = "https://cdn.pixabay.com/audio/2024/11/29/audio_d4b497e08a.mp3";

export default function BackgroundMusic() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const audio = new Audio(MUSIC_URL);
    audio.loop = true;
    audio.volume = 0.3;
    audio.addEventListener("canplaythrough", () => setLoaded(true));
    audioRef.current = audio;
    return () => {
      audio.pause();
      audio.src = "";
    };
  }, []);

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(() => {});
    }
    setPlaying(!playing);
  };

  return (
    <button
      onClick={toggle}
      className="fixed bottom-4 right-4 z-50 w-12 h-12 rounded-full flex items-center justify-center text-lg transition-all hover:scale-110 active:scale-95"
      style={{
        background: playing
          ? "linear-gradient(135deg, #ffd700, #ff8c00)"
          : "rgba(255,255,255,0.1)",
        border: "2px solid rgba(255,215,0,0.4)",
        color: playing ? "#1a0a00" : "#ffd700",
        boxShadow: playing ? "0 0 20px rgba(255,215,0,0.4)" : "none",
        animation: playing ? "music-pulse 1s ease-in-out infinite" : "none",
      }}
      title={playing ? "Tắt nhạc" : "Bật nhạc"}
    >
      {playing ? "🎵" : "🔇"}
      <style>{`
        @keyframes music-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
      `}</style>
    </button>
  );
}
