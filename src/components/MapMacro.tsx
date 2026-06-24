import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import * as d3 from "d3";
import { motion } from "motion/react";

interface GeoJsonFeature {
  type: "Feature";
  properties: Record<string, unknown>;
  geometry: {
    type: string;
    coordinates: unknown;
  };
}

interface GeoJsonFeatureCollection {
  type: "FeatureCollection";
  features: GeoJsonFeature[];
}

// Negara diperbanyak biar kawasan Pasifik keliatan full
const COUNTRY_MARKERS = [
  { code: "fji", name: "Fiji", coords: [178.065, -17.7134] },
  { code: "png", name: "Papua New Guinea", coords: [143.9555, -6.3149] },
  { code: "vut", name: "Vanuatu", coords: [167.9548, -15.3767] },
  { code: "slb", name: "Solomon Islands", coords: [160.1561, -9.6457] },
  { code: "wsm", name: "Samoa", coords: [-172.1046, -13.759] },
  { code: "kir", name: "Kiribati", coords: [173.0, 1.4167] },
  { code: "ton", name: "Tonga", coords: [-175.1982, -21.1789] },
  { code: "nru", name: "Nauru", coords: [166.9315, -0.5228] },
  { code: "tuv", name: "Tuvalu", coords: [179.194, -8.5167] },
  { code: "mhl", name: "Marshall Islands", coords: [171.1845, 7.1315] },
  { code: "plw", name: "Palau", coords: [134.4967, 7.5149] },
  { code: "fsm", name: "Micronesia", coords: [158.1499, 6.915] },
];

interface MapMacroProps {
  onSelectCountry: (countryCode: string, cx: number, cy: number) => void;
}

export default function MapMacro({ onSelectCountry }: MapMacroProps) {
  const [baseMap, setBaseMap] = useState<GeoJsonFeature[]>([]);
  // Sekarang kita simpan x,y yang presisi dari tengah titik, bukan dari kursor
  const [hovered, setHovered] = useState<{
    name: string;
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    const fetchMap = async () => {
      try {
        const response = await fetch(
          "https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson",
        );
        if (!response.ok)
          throw new Error(`HTTP error! status: ${response.status}`);
        const data = (await response.json()) as GeoJsonFeatureCollection;
        setBaseMap(data.features);
      } catch (err) {
        console.error("Failed to load world map:", err);
      }
    };
    fetchMap();
  }, []);

  const projection = d3
    .geoMercator()
    .center([150, -5])
    .scale(450)
    .translate([400, 300]);

  const pathGenerator = d3.geoPath().projection(projection);

  return (
    <>
      <svg
        viewBox="0 0 800 600"
        className="h-full w-full overflow-visible drop-shadow-2xl"
      >
        {/* BASE MAP LAYER */}
        <g>
          {baseMap.map((feature, i) => (
            <path
              key={`base-${i}`}
              d={pathGenerator(feature as GeoJSON.Feature) || ""}
              fill="#171717"
              stroke="#262626"
              strokeWidth={0.5}
            />
          ))}
        </g>

        {/* GLOWING NODES */}
        {COUNTRY_MARKERS.map((marker) => {
          const projected = projection(marker.coords as [number, number]);
          if (!projected) return null;
          const [cx, cy] = projected;

          return (
            <g key={marker.code} transform={`translate(${cx}, ${cy})`}>
              {/* HACK PRESISI: Hit Area transparan ini yang jadi sensor. 
                Kita hitung exact posisi layar pake getBoundingClientRect()
              */}
              <circle
                r={20} // Hit area digedein biar gampang dipencet
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={(e) => {
                  const svg = e.currentTarget.ownerSVGElement;
                  if (!svg) return;

                  // 1. Bikin titik referensi virtual di koordinat lokal <g>
                  const pt = svg.createSVGPoint();
                  pt.x = 0; // Tengah node secara horizontal
                  pt.y = -30; // Tepat di ujung atas garis radar!

                  // 2. Ambil matriks transformasi (CTM) dari elemen tersebut
                  const ctm = e.currentTarget.getScreenCTM();
                  if (!ctm) return;

                  // 3. Konversi titik SVG tadi jadi pixel pasti di viewport/layar
                  const screenPos = pt.matrixTransform(ctm);

                  setHovered({
                    name: marker.name,
                    x: screenPos.x,
                    y: screenPos.y,
                  });
                }}
                onMouseLeave={() => setHovered(null)}
                onClick={() => onSelectCountry(marker.code, cx, cy)}
              />

              {/* Titik Inti (Ubah ke Putih) */}
              <circle
                r={4}
                fill="#ffffff"
                opacity={0.8}
                className="pointer-events-none transition-transform duration-300 group-hover:scale-150"
              />

              {/* Garis Vertikal Ala Radar (Ubah ke Putih) */}
              <line
                x1={0}
                y1={0}
                x2={0}
                y2={-30}
                stroke="#ffffff"
                strokeWidth={1}
                opacity={0.3}
                className="pointer-events-none" // Biar gak ngetrigger hover secara ga sengaja
              />
            </g>
          );
        })}
      </svg>

      {/* HOLOGRAM LABEL - Pake createPortal biar flat/gak miring 
        dan posisinya nempel mati di titik! 
      */}
      {hovered &&
        typeof window !== "undefined" &&
        createPortal(
          <motion.div
            // Pindahkan logic centering ke x dan y nya Framer Motion
            // y: "-90%" buat start animasi dari bawah dikit
            initial={{ opacity: 0, x: "-50%", y: "-90%" }}
            // y: "-100%" narik elemen persis ke atas titik koordinat
            animate={{ opacity: 1, x: "-50%", y: "-100%" }}
            className="pointer-events-none fixed z-[9999] flex flex-col items-center"
            style={{
              left: hovered.x,
              top: hovered.y,
              // HAPUS property transform dari sini!
            }}
          >
            <div className="text-sm font-bold tracking-widest text-neutral-900 bg-white/95 px-3 py-1 border border-neutral-300 backdrop-blur-md shadow-[0_0_15px_rgba(255,255,255,0.2)]">
              {hovered.name}
            </div>
            <div className="h-4 w-[1px] bg-white shadow-[0_0_5px_rgba(255,255,255,0.5)]" />
          </motion.div>,
          document.body,
        )}
    </>
  );
}
