import SplitText from "./texts/SplitText";

export default function CreditScene() {
  return (
    <div className="mx-auto max-w-6xl px-8 w-full grid grid-cols-1 md:grid-cols-12 gap-12 text-neutral-400">
      {/* KOLOM KIRI - Deskripsi & Metodologi */}
      <div className="md:col-span-8 flex flex-col space-y-6">
        <SplitText
          text="Pacific Dataviz Challenge 2026"
          tag="h3"
          className="text-3xl font-display font-bold text-neutral-200 tracking-tight"
          splitType="words"
          textAlign="left"
          delay={40}
        />

        <div className="space-y-4 text-sm leading-relaxed text-neutral-400 font-sans">
          <SplitText
            text="Methodology"
            tag="h4"
            className="font-bold tracking-widest text-neutral-500 uppercase text-xs mb-2"
            splitType="chars"
            textAlign="left"
          />
          <SplitText
            text="This project is built on React.js, a JavaScript framework for creating reactive web applications. The interactive visualizations are developed using D3.js, a library for binding data to graphical elements and animating changes."
            tag="p"
            splitType="lines"
            textAlign="left"
            delay={20}
          />
          <SplitText
            text="Additional supporting visuals and seamless interactions are powered by Motion and React Bits. The data sources for each visualization can be found below their respective sections, with all datasets being open source."
            tag="p"
            splitType="lines"
            textAlign="left"
            delay={20}
          />

          <div className="pt-6">
            <a
              href="https://github.com/JustDannn/PacificDataViz.git"
              target="_blank"
              rel="noreferrer"
              className="group inline-flex items-center gap-2 text-neutral-300 hover:text-white transition-colors"
            >
              <SplitText
                text="View source code on GitHub"
                tag="span"
                splitType="words"
                textAlign="left"
              />
              <svg
                className="w-4 h-4 transition-transform group-hover:-translate-y-1 group-hover:translate-x-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14 5l7 7m0 0l-7 7m7-7H3"
                />
              </svg>
            </a>
          </div>
        </div>
      </div>

      {/* KOLOM KANAN - Authors */}
      <div className="md:col-span-4 flex flex-col space-y-6 md:pl-10">
        <SplitText
          text="Authors"
          tag="h3"
          className="font-bold tracking-widest text-neutral-500 uppercase text-xs mb-2"
          splitType="chars"
          textAlign="left"
        />
        <ul className="space-y-5 text-sm font-sans">
          <li className="flex flex-col group">
            <span className="font-semibold text-neutral-200">
              Nur Fattah Hamdani
              <span className="text-[10px] uppercase tracking-wider text-yellow-500 ml-2 border border-yellow-500/30 bg-yellow-500/10 px-1.5 py-0.5 rounded">
                Corresponding
              </span>
            </span>
            <a
              href="mailto:nurfattahhamdani@student.telkomuniversity.ac.id"
              className="text-neutral-500 group-hover:text-neutral-300 transition-colors"
            >
              nurfattahhamdani@student.telkomuniversity.ac.id
            </a>
          </li>

          <li className="flex flex-col group">
            <span className="font-semibold text-neutral-200">
              Annisa Sofia Albana
            </span>
            <a
              href="mailto:annisasofiaalbana@student.telkomuniversity.ac.id"
              className="text-neutral-500 group-hover:text-neutral-300 transition-colors"
            >
              annisasofiaalbana@student.telkomuniversity.ac.id
            </a>
          </li>

          <li className="flex flex-col group">
            <span className="font-semibold text-neutral-200">
              Adhinda Dwi Rahmadilla
            </span>
            <a
              href="mailto:adhindadwirahmadilla@student.telkomuniversity.ac.id"
              className="text-neutral-500 group-hover:text-neutral-300 transition-colors"
            >
              adhindadwirahmadilla@student.telkomuniversity.ac.id
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
}
