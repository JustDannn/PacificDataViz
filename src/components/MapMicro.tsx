// src/components/MapMicro.tsx
import React, { useState, useEffect, useMemo } from "react";
import * as d3 from "d3";

interface MapMicroProps {
  countryCode: string;
}

export default function MapMicro({ countryCode }: MapMicroProps) {
  const [geoData, setGeoData] = useState<GeoJSON.FeatureCollection | null>(
    null,
  );
  const [error, setError] = useState(false);

  useEffect(() => {
    // Ambil data GeoJSON abrasi negara yang diklik
    const fetchGeoData = async () => {
      try {
        const BASE_HF_URL =
          "https://huggingface.co/datasets/jsdann/PacificDataViz/resolve/main";
        const res = await fetch(
          `${BASE_HF_URL}/countries/${countryCode.toLowerCase()}.json`,
        );
        if (!res.ok) throw new Error("Data not found");
        const data = (await res.json()) as GeoJSON.FeatureCollection;
        setGeoData(data);
        setError(false);
      } catch (err) {
        console.error("Gagal nge-load data abrasi:", err);
        setError(true);
      }
    };
    fetchGeoData();
  }, [countryCode]);

  // Bikin path generator yang OTOMATIS nge-zoom ke bounding box pulau
  const pathGenerator = useMemo(() => {
    if (!geoData) return null;

    // fitSize([width, height], object) otomatis ngatur skala dan posisi
    const projection = d3.geoMercator().fitSize([800, 600], geoData);

    return d3.geoPath().projection(projection);
  }, [geoData]);

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center text-neutral-500 font-mono">
        [ Data for {countryCode.toUpperCase()} is missing in public/data/ ]
      </div>
    );
  }

  if (!geoData) {
    return (
      <div className="flex h-full w-full items-center justify-center text-white">
        Scanning topography...
      </div>
    );
  }

  // Bikin skala warna Magma. Asumsi datanya berupa FeatureCollection
  // di mana urutan feature merepresentasikan tahun (dari terluar ke terdalam)
  const featuresCount = geoData.features.length;
  // Kita balik domainnya dikit biar pinggiran terluar warnanya lebih gelap/terang sesuai selera
  const colorScale = d3
    .scaleSequential(d3.interpolateMagma)
    .domain([featuresCount, 0]);

  return (
    <svg viewBox="0 0 800 600" className="h-full w-full drop-shadow-2xl">
      {/* Gambar layernya tumpuk-tumpukan */}
      <g>
        {pathGenerator &&
          geoData.features.map((feature, index: number) => {
            const year = (feature.properties as Record<string, unknown> | null)
              ?.year;
            const yearLabel = year != null ? String(year) : "Unknown Year";
            return (
              <path
                key={`layer-${index}`}
                d={pathGenerator(feature) || ""}
                fill={colorScale(index)}
                stroke="#ffffff"
                strokeWidth={0.5}
                strokeOpacity={0.2}
                className="cursor-crosshair transition-all duration-300 hover:opacity-80"
              >
                {/* Tooltip bawaan SVG sederhana (optional) */}
                <title>{`Layer ${index} - ${yearLabel}`}</title>
              </path>
            );
          })}
      </g>
    </svg>
  );
}
