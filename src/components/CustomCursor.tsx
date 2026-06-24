import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";

export default function CustomCursor() {
  const [isVisible, setIsVisible] = useState(false);

  // Titik koordinat asli mouse
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Spring config buat Ring biar agak delay/smooth
  const springConfig = { damping: 25, stiffness: 400, mass: 0.5 };

  // Spring buat posisi Ring
  const ringX = useSpring(mouseX, springConfig);
  const ringY = useSpring(mouseY, springConfig);

  // Transform mouse position untuk dot (kurangi 4 biar persis di tengah)
  const dotX = useTransform(mouseX, (v) => v - 4);
  const dotY = useTransform(mouseY, (v) => v - 4);

  useEffect(() => {
    const updateMousePosition = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);

      // Center ring di mouse (-20 offset biar 40px ring center)
      ringX.set(e.clientX - 20);
      ringY.set(e.clientY - 20);

      if (!isVisible) setIsVisible(true);
    };

    const handleMouseEnter = () => setIsVisible(true);
    const handleMouseLeave = () => setIsVisible(false);

    window.addEventListener("mousemove", updateMousePosition);
    window.addEventListener("mouseenter", handleMouseEnter);
    window.addEventListener("mouseleave", handleMouseLeave);

    // FIX SYNTAX ERROR-NYA DI SINI
    return () => {
      window.removeEventListener("mousemove", updateMousePosition);
      window.removeEventListener("mouseenter", handleMouseEnter);
      window.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [mouseX, mouseY, ringX, ringY, isVisible]);

  if (typeof window === "undefined") return null;

  return (
    <>
      {/* LINGKARAN LUAR (Ring) */}
      <motion.div
        className="pointer-events-none fixed left-0 top-0 z-[9999] h-[40px] w-[40px] rounded-full border-2 border-white mix-blend-difference"
        style={{
          x: ringX,
          y: ringY,
          opacity: isVisible ? 1 : 0,
        }}
        transition={{ opacity: { duration: 0.2 } }}
      />

      {/* TITIK INTI (Dot) */}
      <motion.div
        className="pointer-events-none fixed left-0 top-0 z-[9999] h-[8px] w-[8px] rounded-full bg-white mix-blend-difference"
        style={{
          x: dotX,
          y: dotY,
          opacity: isVisible ? 1 : 0,
        }}
        transition={{ opacity: { duration: 0.2 } }}
      />
    </>
  );
}
