import { useRef, useState } from "react";
import "./style.css";
import {
  motion,
  useScroll,
  useTransform,
  useMotionValueEvent,
  useMotionTemplate,
  AnimatePresence,
} from "motion/react";
import SideRays from "@/components/SideRays";
import SplitText from "./components/texts/SplitText";
import MapMacro from "./components/MapMacro";
import CountryDetail from "./components/CountryDetail";
import CustomCursor from "./components/CustomCursor";
const NARRATIVE_STEPS = [
  "SINKING PARADISE",
  "The waters are rising.",
  "Year after year, the coastlines fade.",
];

function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    if (latest < 0.15) setActiveStep(0);
    else if (latest < 0.3) setActiveStep(1);
    else if (latest < 0.45) setActiveStep(2);
    else setActiveStep(3); // Teks hilang
  });

  // Cahaya ilang lebih cepet
  const raysOpacity = useTransform(scrollYProgress, [0.35, 0.5], [1, 0]);

  // 0.90 ke 1.0 map nge-zoom out.
  const mapOpacity = useTransform(
    scrollYProgress,
    [0.5, 0.6, 0.9, 1.0],
    [0, 1, 1, 0],
  );
  const mapBlurValue = useTransform(
    scrollYProgress,
    [0.5, 0.6, 0.9, 1.0],
    [20, 0, 0, 20],
  );
  const mapFilter = useMotionTemplate`blur(${mapBlurValue}px)`;
  const mapScale = useTransform(
    scrollYProgress,
    [0.5, 0.6, 0.9, 1.0],
    [0.8, 1.3, 1.3, 3],
  );
  const mapRotateX = useTransform(
    scrollYProgress,
    [0.5, 0.6, 0.9, 1.0],
    ["0deg", "55deg", "55deg", "60deg"],
  );
  const mapRotateZ = useTransform(
    scrollYProgress,
    [0.5, 0.6, 0.9, 1.0],
    ["0deg", "-20deg", "-20deg", "-25deg"],
  );
  const mapY = useTransform(
    scrollYProgress,
    [0.5, 0.6, 0.9, 1.0],
    ["0px", "50px", "50px", "100px"],
  );
  const titleOpacity = useTransform(
    scrollYProgress,
    [0.55, 0.6, 0.9, 1.0],
    [0, 1, 1, 0],
  );

  return (
    <div className="relative w-full bg-neutral-950 font-sans text-neutral-200">
      <CustomCursor />
      <motion.div
        className="fixed inset-0 z-0 pointer-events-none"
        style={{ opacity: raysOpacity }}
      >
        <SideRays
          rayColor1="#EAB308"
          rayColor2="#96c8ff"
          origin="top-right"
          speed={2.5}
          intensity={2}
          spread={2}
          tilt={0}
          saturation={1.5}
          blend={0.75}
          falloff={1.6}
          opacity={1}
        />
      </motion.div>

      {/* 2. PANGGUNG DIPANGKAS JADI 400vh */}
      <div ref={containerRef} className="relative h-[400vh] w-full">
        <div className="sticky top-0 h-screen w-full overflow-hidden flex items-center justify-center">
          {/* LAYER HERO TEXT */}
          <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
            {activeStep < 3 &&
              NARRATIVE_STEPS.map(
                (text, i) =>
                  activeStep === i && (
                    <div
                      key={i}
                      className="absolute flex items-center justify-center"
                    >
                      <div className="p-4 rounded-xl cursor-pointer pointer-events-auto">
                        <SplitText
                          text={text}
                          className="font-display text-5xl font-bold tracking-tight text-white sm:text-7xl"
                          delay={40}
                          duration={1}
                          ease="power4.out"
                          splitType={i === 0 ? "chars" : "words"}
                          from={{ opacity: 0, y: 30 }}
                          to={{ opacity: 1, y: 0 }}
                        />
                      </div>
                    </div>
                  ),
              )}

            {/* Bullets */}
            <div className="absolute bottom-16 left-1/2 flex -translate-x-1/2 gap-4">
              {activeStep < 3 &&
                NARRATIVE_STEPS.map((_, index) => (
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

          {/* LAYER JUDUL MAP */}
          <motion.div
            className="absolute top-10 left-10 z-30 pointer-events-none"
            style={{ opacity: titleOpacity }}
          >
            <div className="p-2 cursor-pointer pointer-events-auto rounded-lg">
              <h2 className="text-2xl font-bold tracking-widest text-neutral-200">
                THE PACIFIC REALM
              </h2>
              <p className="text-sm text-neutral-500">
                Select a glowing node to inspect shoreline degradation.
              </p>
            </div>
          </motion.div>

          {/* LAYER MAP MACRO */}
          <motion.div
            className="absolute z-10 flex items-center justify-center h-[600px] w-[800px]"
            style={{
              opacity: mapOpacity,
              filter: mapFilter,
              scale: mapScale,
              rotateX: mapRotateX,
              rotateZ: mapRotateZ,
              y: mapY,
              transformStyle: "preserve-3d",
            }}
          >
            <MapMacro onSelectCountry={(code) => setSelectedCountry(code)} />
          </motion.div>
        </div>
      </div>

      {/* 3. OVERLAY COUNTRY DETAIL */}
      <AnimatePresence>
        {selectedCountry && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="fixed inset-0 z-[100]"
          >
            <CountryDetail
              countryCode={selectedCountry}
              onBack={() => setSelectedCountry(null)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
