import { useRef, useState } from "react";
import { useScroll, useMotionValueEvent } from "framer-motion";
import SplitText from "./texts/SplitText";

const NARRATIVE_STEPS = [
  "SINKING PARADISE",
  "The waters are rising.",
  "Year after year, the coastlines fade.",
];

export default function HeroSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeStep, setActiveStep] = useState(0);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    if (latest < 0.33) setActiveStep(0);
    else if (latest < 0.66) setActiveStep(1);
    else setActiveStep(2);
  });

  return (
    <section ref={containerRef} className="relative h-[300vh] w-full">
      <div className="sticky top-0 flex h-screen w-full items-center justify-center overflow-hidden">
        <div className="relative z-10 w-full px-6 text-center">
          {NARRATIVE_STEPS.map(
            (text, index) =>
              activeStep === index && (
                <div
                  key={index}
                  className="absolute left-1/2 top-1/2 w-full -translate-x-1/2 -translate-y-1/2"
                >
                  <SplitText
                    text={text}
                    className="font-display text-5xl font-bold tracking-tight text-white sm:text-7xl"
                    delay={40}
                    duration={1}
                    ease="power4.out"
                    splitType={index === 0 ? "chars" : "words"}
                    from={{ opacity: 0, y: 30 }}
                    to={{ opacity: 1, y: 0 }}
                  />
                </div>
              ),
          )}
        </div>

        <div className="absolute bottom-16 left-1/2 z-20 flex -translate-x-1/2 gap-4">
          {NARRATIVE_STEPS.map((_, index) => (
            <div
              key={index}
              className={`h-1.5 w-1.5 rounded-full transition-all duration-300 ${
                activeStep === index
                  ? "bg-white scale-125"
                  : "bg-white/30 hover:bg-white/50"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
