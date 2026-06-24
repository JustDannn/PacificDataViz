import React, { useEffect, useRef, useState, useMemo } from "react";
import * as d3 from "d3";

// ─── Interfaces ─────────────────────────────────────────────────────────────
interface GeoJsonFeature {
  type: "Feature";
  properties: {
    year: number;
    [key: string]: unknown;
  };
  geometry: {
    type: string;
    coordinates: unknown;
  };
}

interface GeoJsonFeatureCollection {
  type: "FeatureCollection";
  features: GeoJsonFeature[];
}

interface CountryDetailProps {
  countryCode: string;
  onBack: () => void;
}

// ─── Data point interfaces ──────────────────────────────────────────────────
interface ClimateDataPoint {
  year: number;
  value: number;
}

interface DashboardData {
  seaLevel: ClimateDataPoint[];
  seaSurfaceTemp: ClimateDataPoint[];
  ghgEmission: ClimateDataPoint[];
  redListIndex: ClimateDataPoint[];
}

// ─── ISO-3 (lowercase) → SPC PICT 2-letter code mapping ────────────────────
const ISO3_TO_PICT: Record<string, string> = {
  asm: "AS",
  cok: "CK",
  fji: "FJ",
  fsm: "FM",
  gum: "GU",
  kir: "KI",
  mhl: "MH",
  mnp: "MP",
  ncl: "NC",
  nru: "NR",
  niu: "NU",
  pyf: "PF",
  png: "PG",
  plw: "PW",
  slb: "SB",
  tkl: "TK",
  ton: "TO",
  tuv: "TV",
  vut: "VU",
  wlf: "WF",
  wsm: "WS",
  pcn: "PN",
};

// ─── Country full names ─────────────────────────────────────────────────────
const COUNTRY_NAMES: Record<string, string> = {
  asm: "American Samoa",
  cok: "Cook Islands",
  fji: "Fiji",
  fsm: "Micronesia",
  gum: "Guam",
  kir: "Kiribati",
  mhl: "Marshall Islands",
  mnp: "Northern Mariana Islands",
  ncl: "New Caledonia",
  nru: "Nauru",
  niu: "Niue",
  pyf: "French Polynesia",
  png: "Papua New Guinea",
  plw: "Palau",
  slb: "Solomon Islands",
  tkl: "Tokelau",
  ton: "Tonga",
  tuv: "Tuvalu",
  vut: "Vanuatu",
  wlf: "Wallis & Futuna",
  wsm: "Samoa",
  pcn: "Pitcairn Islands",
};

// ─── Magma‑inspired palette ─────────────────────────────────────────────────
const MAGMA = {
  yellow: "#fcffa4",
  orange: "#f98e09",
  magenta: "#bc3754",
  purple: "#8b0aa5",
  deepPurple: "#57157e",
  dark: "#221150",
  bg: "#0a0a0a",
};

// ─── CSV file paths (URL-encoded because of commas in names) ────────────────
const CSV_PATHS = {
  seaLevel: "/data/SPC,DF_CLIMATE_CHANGE,1.0,filtered,2026-06-19 02-06-44.csv",
  seaSurfaceTemp:
    "/data/SPC,DF_CLIMATE_CHANGE,1.0,filtered,2026-06-19 02-07-30.csv",
  ghgEmission:
    "/data/SPC,DF_CLIMATE_CHANGE,1.0,filtered,2026-06-19 02-08-03.csv",
  redListIndex: "/data/SPC,DF_SDG_15,3.0,filtered,2026-06-19 02-07-48.csv",
};

// ═══════════════════════════════════════════════════════════════════════════
// REUSABLE D3 CHART COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

// ─── Dual Axis: GHG Emission (Bar) + Sea Surface Temp (Line) ────────────────
function DualAxisChart({
  ghg,
  sst,
}: {
  ghg: ClimateDataPoint[];
  sst: ClimateDataPoint[];
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;
    if (ghg.length === 0 && sst.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const rect = containerRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const margin = { top: 30, right: 60, bottom: 50, left: 60 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    svg.attr("viewBox", `0 0 ${width} ${height}`);

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Merge year domains
    const allYears = [...ghg.map((d) => d.year), ...sst.map((d) => d.year)];
    const yearExtent = d3.extent(allYears) as [number, number];
    const xScale = d3.scaleLinear().domain(yearExtent).range([0, innerW]);

    // GHG scale (left Y)
    const ghgMax = d3.max(ghg, (d) => d.value) || 1;
    const yGhg = d3
      .scaleLinear()
      .domain([0, ghgMax * 1.15])
      .range([innerH, 0]);

    // SST scale (right Y)
    const sstExtent = d3.extent(sst, (d) => d.value) as [number, number];
    const ySst = d3
      .scaleLinear()
      .domain([(sstExtent[0] || 0) - 0.2, (sstExtent[1] || 1) + 0.2])
      .range([innerH, 0]);

    // ── Bars (GHG Emission) ──
    const barWidth = Math.max(
      1,
      innerW / (yearExtent[1] - yearExtent[0] + 1) - 2,
    );
    g.selectAll("rect.ghg-bar")
      .data(ghg)
      .enter()
      .append("rect")
      .attr("class", "ghg-bar")
      .attr("x", (d) => xScale(d.year) - barWidth / 2)
      .attr("y", innerH)
      .attr("width", barWidth)
      .attr("height", 0)
      .attr("fill", MAGMA.deepPurple)
      .attr("opacity", 0.7)
      .attr("rx", 1)
      .transition()
      .duration(800)
      .delay((_, i) => i * 15)
      .attr("y", (d) => yGhg(d.value))
      .attr("height", (d) => innerH - yGhg(d.value));

    // ── Line (SST Anomaly) ──
    const line = d3
      .line<ClimateDataPoint>()
      .x((d) => xScale(d.year))
      .y((d) => ySst(d.value))
      .curve(d3.curveCatmullRom.alpha(0.5));

    const linePath = g
      .append("path")
      .datum(sst)
      .attr("fill", "none")
      .attr("stroke", MAGMA.orange)
      .attr("stroke-width", 2.5)
      .attr("d", line);

    // Animate line drawing
    const totalLen = (linePath.node() as SVGPathElement)?.getTotalLength() || 0;
    linePath
      .attr("stroke-dasharray", totalLen)
      .attr("stroke-dashoffset", totalLen)
      .transition()
      .duration(1500)
      .ease(d3.easeQuadOut)
      .attr("stroke-dashoffset", 0);

    // ── SST dot glow ──
    g.selectAll("circle.sst-dot")
      .data(
        sst.filter(
          (_, i) => i % Math.max(1, Math.floor(sst.length / 20)) === 0,
        ),
      )
      .enter()
      .append("circle")
      .attr("class", "sst-dot")
      .attr("cx", (d) => xScale(d.year))
      .attr("cy", (d) => ySst(d.value))
      .attr("r", 3)
      .attr("fill", MAGMA.orange)
      .attr("opacity", 0)
      .transition()
      .delay(1500)
      .duration(400)
      .attr("opacity", 0.9);

    // ── Axes ──
    const xAxis = d3
      .axisBottom(xScale)
      .tickFormat(d3.format("d"))
      .ticks(Math.min(10, yearExtent[1] - yearExtent[0]));

    g.append("g")
      .attr("transform", `translate(0,${innerH})`)
      .call(xAxis)
      .call((sel) => {
        sel.selectAll("text").attr("fill", "#737373").attr("font-size", "10px");
        sel.selectAll("line").attr("stroke", "#404040");
        sel.select(".domain").attr("stroke", "#404040");
      });

    // Left Y axis (GHG)
    g.append("g")
      .call(d3.axisLeft(yGhg).ticks(5))
      .call((sel) => {
        sel
          .selectAll("text")
          .attr("fill", MAGMA.deepPurple)
          .attr("font-size", "10px");
        sel.selectAll("line").attr("stroke", "#262626");
        sel.select(".domain").attr("stroke", "#262626");
      });

    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", -45)
      .attr("x", -innerH / 2)
      .attr("text-anchor", "middle")
      .attr("fill", MAGMA.deepPurple)
      .attr("font-size", "10px")
      .attr("letter-spacing", "0.1em")
      .text("GHG EMISSION (t/capita)");

    // Right Y axis (SST)
    g.append("g")
      .attr("transform", `translate(${innerW},0)`)
      .call(d3.axisRight(ySst).ticks(5))
      .call((sel) => {
        sel
          .selectAll("text")
          .attr("fill", MAGMA.orange)
          .attr("font-size", "10px");
        sel.selectAll("line").attr("stroke", "#262626");
        sel.select(".domain").attr("stroke", "#262626");
      });

    g.append("text")
      .attr("transform", "rotate(90)")
      .attr("y", -innerW - 45)
      .attr("x", innerH / 2)
      .attr("text-anchor", "middle")
      .attr("fill", MAGMA.orange)
      .attr("font-size", "10px")
      .attr("letter-spacing", "0.1em")
      .text("SST ANOMALY (°C)");

    // ── Legend ──
    const legend = g
      .append("g")
      .attr("transform", `translate(${innerW - 180}, -15)`);

    legend
      .append("rect")
      .attr("width", 12)
      .attr("height", 12)
      .attr("fill", MAGMA.deepPurple)
      .attr("opacity", 0.7)
      .attr("rx", 2);
    legend
      .append("text")
      .attr("x", 18)
      .attr("y", 10)
      .attr("fill", "#a3a3a3")
      .attr("font-size", "10px")
      .text("GHG Emission");

    legend
      .append("line")
      .attr("x1", 110)
      .attr("y1", 6)
      .attr("x2", 130)
      .attr("y2", 6)
      .attr("stroke", MAGMA.orange)
      .attr("stroke-width", 2.5);
    legend
      .append("text")
      .attr("x", 136)
      .attr("y", 10)
      .attr("fill", "#a3a3a3")
      .attr("font-size", "10px")
      .text("SST");
  }, [ghg, sst]);

  return (
    <div ref={containerRef} className="h-full w-full">
      <svg
        ref={svgRef}
        className="h-full w-full"
        preserveAspectRatio="xMidYMid meet"
      />
    </div>
  );
}

// ─── Sea Level Anomaly Area Chart ───────────────────────────────────────────
function SeaLevelChart({ data }: { data: ClimateDataPoint[] }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || data.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const rect = containerRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const margin = { top: 20, right: 30, bottom: 50, left: 60 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    svg.attr("viewBox", `0 0 ${width} ${height}`);

    // Gradient definition
    const defs = svg.append("defs");
    const gradient = defs
      .append("linearGradient")
      .attr("id", "sea-level-gradient")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "0%")
      .attr("y2", "100%");
    gradient
      .append("stop")
      .attr("offset", "0%")
      .attr("stop-color", MAGMA.magenta)
      .attr("stop-opacity", 0.5);
    gradient
      .append("stop")
      .attr("offset", "100%")
      .attr("stop-color", MAGMA.dark)
      .attr("stop-opacity", 0.05);

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const xScale = d3
      .scaleLinear()
      .domain(d3.extent(data, (d) => d.year) as [number, number])
      .range([0, innerW]);

    const yExtent = d3.extent(data, (d) => d.value) as [number, number];
    const yPad = Math.max(0.01, (yExtent[1] - yExtent[0]) * 0.2);
    const yScale = d3
      .scaleLinear()
      .domain([yExtent[0] - yPad, yExtent[1] + yPad])
      .range([innerH, 0]);

    // Zero line
    if (yExtent[0] <= 0 && yExtent[1] >= 0) {
      g.append("line")
        .attr("x1", 0)
        .attr("x2", innerW)
        .attr("y1", yScale(0))
        .attr("y2", yScale(0))
        .attr("stroke", "#404040")
        .attr("stroke-dasharray", "4,4");
    }

    // Area
    const area = d3
      .area<ClimateDataPoint>()
      .x((d) => xScale(d.year))
      .y0(innerH)
      .y1((d) => yScale(d.value))
      .curve(d3.curveCatmullRom.alpha(0.5));

    g.append("path")
      .datum(data)
      .attr("fill", "url(#sea-level-gradient)")
      .attr("d", area)
      .attr("opacity", 0)
      .transition()
      .duration(1000)
      .attr("opacity", 1);

    // Line
    const line = d3
      .line<ClimateDataPoint>()
      .x((d) => xScale(d.year))
      .y((d) => yScale(d.value))
      .curve(d3.curveCatmullRom.alpha(0.5));

    const linePath = g
      .append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", MAGMA.magenta)
      .attr("stroke-width", 2)
      .attr("d", line);

    const totalLen = (linePath.node() as SVGPathElement)?.getTotalLength() || 0;
    linePath
      .attr("stroke-dasharray", totalLen)
      .attr("stroke-dashoffset", totalLen)
      .transition()
      .duration(1200)
      .ease(d3.easeQuadOut)
      .attr("stroke-dashoffset", 0);

    // Axes
    g.append("g")
      .attr("transform", `translate(0,${innerH})`)
      .call(
        d3
          .axisBottom(xScale)
          .tickFormat(d3.format("d"))
          .ticks(Math.min(10, data.length)),
      )
      .call((sel) => {
        sel.selectAll("text").attr("fill", "#737373").attr("font-size", "10px");
        sel.selectAll("line").attr("stroke", "#404040");
        sel.select(".domain").attr("stroke", "#404040");
      });

    g.append("g")
      .call(d3.axisLeft(yScale).ticks(5))
      .call((sel) => {
        sel.selectAll("text").attr("fill", "#737373").attr("font-size", "10px");
        sel.selectAll("line").attr("stroke", "#262626");
        sel.select(".domain").attr("stroke", "#262626");
      });

    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", -45)
      .attr("x", -innerH / 2)
      .attr("text-anchor", "middle")
      .attr("fill", MAGMA.magenta)
      .attr("font-size", "10px")
      .attr("letter-spacing", "0.1em")
      .text("SEA LEVEL (m)");

    // Interactive tooltip
    const focus = g.append("g").style("display", "none");
    focus
      .append("line")
      .attr("class", "hover-line")
      .attr("y1", 0)
      .attr("y2", innerH)
      .attr("stroke", "#525252")
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "3,3");
    focus
      .append("circle")
      .attr("r", 5)
      .attr("fill", MAGMA.magenta)
      .attr("stroke", MAGMA.yellow)
      .attr("stroke-width", 1.5);
    const tooltip = focus.append("g");
    tooltip
      .append("rect")
      .attr("rx", 4)
      .attr("fill", "#171717")
      .attr("stroke", "#333")
      .attr("stroke-width", 0.5);
    const tooltipText = tooltip
      .append("text")
      .attr("fill", "#e5e5e5")
      .attr("font-size", "11px")
      .attr("text-anchor", "middle");

    const bisect = d3.bisector<ClimateDataPoint, number>((d) => d.year).left;

    svg
      .append("rect")
      .attr("transform", `translate(${margin.left},${margin.top})`)
      .attr("width", innerW)
      .attr("height", innerH)
      .attr("fill", "transparent")
      .on("mouseenter", () => focus.style("display", null))
      .on("mouseleave", () => focus.style("display", "none"))
      .on("mousemove", function (event) {
        const [mx] = d3.pointer(event, this);
        const x0 = xScale.invert(mx);
        const i = Math.min(data.length - 1, bisect(data, x0, 1));
        const d0 = data[i - 1];
        const d1 = data[i];
        const d = d0 && d1 ? (x0 - d0.year > d1.year - x0 ? d1 : d0) : d1 || d0;
        if (!d) return;
        const px = xScale(d.year);
        const py = yScale(d.value);
        focus.select("line.hover-line").attr("x1", px).attr("x2", px);
        focus.select("circle").attr("cx", px).attr("cy", py);
        const label = `${d.year}: ${d.value.toFixed(3)}m`;
        tooltipText
          .text(label)
          .attr("x", px)
          .attr("y", py - 18);
        const bbox = (tooltipText.node() as SVGTextElement)?.getBBox();
        if (bbox) {
          tooltip
            .select("rect")
            .attr("x", bbox.x - 6)
            .attr("y", bbox.y - 3)
            .attr("width", bbox.width + 12)
            .attr("height", bbox.height + 6);
        }
      });
  }, [data]);

  return (
    <div ref={containerRef} className="h-full w-full">
      <svg
        ref={svgRef}
        className="h-full w-full"
        preserveAspectRatio="xMidYMid meet"
      />
    </div>
  );
}

// ─── Red List Index Trend Chart ─────────────────────────────────────────────
function RedListChart({ data }: { data: ClimateDataPoint[] }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || data.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const rect = containerRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const margin = { top: 20, right: 30, bottom: 50, left: 60 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    svg.attr("viewBox", `0 0 ${width} ${height}`);

    // Gradient
    const defs = svg.append("defs");
    const gradient = defs
      .append("linearGradient")
      .attr("id", "rli-gradient")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "0%")
      .attr("y2", "100%");
    gradient
      .append("stop")
      .attr("offset", "0%")
      .attr("stop-color", MAGMA.yellow)
      .attr("stop-opacity", 0.3);
    gradient
      .append("stop")
      .attr("offset", "100%")
      .attr("stop-color", MAGMA.dark)
      .attr("stop-opacity", 0.02);

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const xScale = d3
      .scaleLinear()
      .domain(d3.extent(data, (d) => d.year) as [number, number])
      .range([0, innerW]);

    const yExtent = d3.extent(data, (d) => d.value) as [number, number];
    const yPad = Math.max(0.01, (yExtent[1] - yExtent[0]) * 0.3);
    const yScale = d3
      .scaleLinear()
      .domain([Math.max(0, yExtent[0] - yPad), Math.min(1, yExtent[1] + yPad)])
      .range([innerH, 0]);

    // Danger zone background (below 0.7 is critical)
    g.append("rect")
      .attr("x", 0)
      .attr("y", yScale(0.7))
      .attr("width", innerW)
      .attr("height", innerH - yScale(0.7))
      .attr("fill", MAGMA.magenta)
      .attr("opacity", 0.06);

    g.append("line")
      .attr("x1", 0)
      .attr("x2", innerW)
      .attr("y1", yScale(0.7))
      .attr("y2", yScale(0.7))
      .attr("stroke", MAGMA.magenta)
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "6,4")
      .attr("opacity", 0.4);

    g.append("text")
      .attr("x", innerW - 4)
      .attr("y", yScale(0.7) - 5)
      .attr("text-anchor", "end")
      .attr("fill", MAGMA.magenta)
      .attr("font-size", "9px")
      .attr("opacity", 0.6)
      .text("CRITICAL THRESHOLD");

    // Area fill
    const area = d3
      .area<ClimateDataPoint>()
      .x((d) => xScale(d.year))
      .y0(innerH)
      .y1((d) => yScale(d.value))
      .curve(d3.curveMonotoneX);

    g.append("path")
      .datum(data)
      .attr("fill", "url(#rli-gradient)")
      .attr("d", area)
      .attr("opacity", 0)
      .transition()
      .duration(1000)
      .attr("opacity", 1);

    // Line
    const line = d3
      .line<ClimateDataPoint>()
      .x((d) => xScale(d.year))
      .y((d) => yScale(d.value))
      .curve(d3.curveMonotoneX);

    const linePath = g
      .append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", MAGMA.yellow)
      .attr("stroke-width", 2.5)
      .attr("d", line);

    const totalLen = (linePath.node() as SVGPathElement)?.getTotalLength() || 0;
    linePath
      .attr("stroke-dasharray", totalLen)
      .attr("stroke-dashoffset", totalLen)
      .transition()
      .duration(1200)
      .ease(d3.easeQuadOut)
      .attr("stroke-dashoffset", 0);

    // Data points with glow
    g.selectAll("circle.rli-dot")
      .data(data)
      .enter()
      .append("circle")
      .attr("class", "rli-dot")
      .attr("cx", (d) => xScale(d.year))
      .attr("cy", (d) => yScale(d.value))
      .attr("r", 4)
      .attr("fill", (d) => (d.value < 0.7 ? MAGMA.magenta : MAGMA.yellow))
      .attr("stroke", "#0a0a0a")
      .attr("stroke-width", 1.5)
      .attr("opacity", 0)
      .transition()
      .delay(1200)
      .duration(400)
      .attr("opacity", 1);

    // Start/end labels
    const first = data[0];
    const last = data[data.length - 1];
    const delta = last.value - first.value;
    const deltaColor = delta < 0 ? MAGMA.magenta : "#4ade80";

    g.append("text")
      .attr("x", xScale(last.year) + 6)
      .attr("y", yScale(last.value) + 4)
      .attr("fill", deltaColor)
      .attr("font-size", "11px")
      .attr("font-weight", "bold")
      .text(`${delta >= 0 ? "+" : ""}${delta.toFixed(3)}`);

    // Axes
    g.append("g")
      .attr("transform", `translate(0,${innerH})`)
      .call(
        d3
          .axisBottom(xScale)
          .tickFormat(d3.format("d"))
          .ticks(Math.min(10, data.length)),
      )
      .call((sel) => {
        sel.selectAll("text").attr("fill", "#737373").attr("font-size", "10px");
        sel.selectAll("line").attr("stroke", "#404040");
        sel.select(".domain").attr("stroke", "#404040");
      });

    g.append("g")
      .call(d3.axisLeft(yScale).ticks(5).tickFormat(d3.format(".2f")))
      .call((sel) => {
        sel.selectAll("text").attr("fill", "#737373").attr("font-size", "10px");
        sel.selectAll("line").attr("stroke", "#262626");
        sel.select(".domain").attr("stroke", "#262626");
      });

    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", -45)
      .attr("x", -innerH / 2)
      .attr("text-anchor", "middle")
      .attr("fill", MAGMA.yellow)
      .attr("font-size", "10px")
      .attr("letter-spacing", "0.1em")
      .text("RED LIST INDEX");
  }, [data]);

  return (
    <div ref={containerRef} className="h-full w-full">
      <svg
        ref={svgRef}
        className="h-full w-full"
        preserveAspectRatio="xMidYMid meet"
      />
    </div>
  );
}
// ─── Inline Highlight for dynamic narrative data points ─────────────────────
function NarrativeHighlight({
  children,
  color = MAGMA.orange,
}: {
  children: React.ReactNode;
  color?: string;
}) {
  return (
    <span
      className="narrative-highlight"
      style={{
        color,
        fontWeight: 800,
        textShadow: `0 0 20px ${color}44, 0 0 40px ${color}22`,
      }}
    >
      {children}
    </span>
  );
}

// ─── Act Progress Pip ───────────────────────────────────────────────────────
function ActPip({ active, color }: { active: boolean; color: string }) {
  return (
    <div
      className="narrative-pip"
      style={{
        width: 8,
        height: 8,
        borderRadius: "50%",
        backgroundColor: active ? color : "#262626",
        boxShadow: active ? `0 0 12px ${color}88` : "none",
        transition: "all 0.5s cubic-bezier(0.4,0,0.2,1)",
      }}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// NARRATIVE SCROLLYTELLING SECTION
// ═══════════════════════════════════════════════════════════════════════════
function NarrativeSection({
  dashData,
  dashLoading,
  hasAnyData,
  countryName,
  scrollRoot,
}: {
  dashData: DashboardData;
  dashLoading: boolean;
  hasAnyData: boolean;
  countryName: string;
  pictCode: string;
  scrollRoot: React.RefObject<HTMLDivElement | null>;
}) {
  const [activeAct, setActiveAct] = useState(0);
  const act1Ref = useRef<HTMLDivElement>(null);
  const act2Ref = useRef<HTMLDivElement>(null);
  const act3Ref = useRef<HTMLDivElement>(null);

  // ── Computed narrative metrics ──────────────────────────────────────────
  const metrics = useMemo(() => {
    const ghg = dashData.ghgEmission;
    const sst = dashData.seaSurfaceTemp;
    const sl = dashData.seaLevel;
    const rli = dashData.redListIndex;

    // GHG
    const latestEmission = ghg.length > 0 ? ghg[ghg.length - 1] : null;
    const earliestEmission = ghg.length > 0 ? ghg[0] : null;
    const emissionGrowthRate =
      latestEmission && earliestEmission && earliestEmission.value !== 0
        ? ((latestEmission.value - earliestEmission.value) /
            earliestEmission.value) *
          100
        : null;

    // SST
    const latestSST = sst.length > 0 ? sst[sst.length - 1] : null;
    const earliestSST = sst.length > 0 ? sst[0] : null;
    const tempDelta =
      latestSST && earliestSST ? latestSST.value - earliestSST.value : null;
    const peakSST =
      sst.length > 0 ? sst.reduce((a, b) => (b.value > a.value ? b : a)) : null;

    // Sea Level
    const latestSeaLevel = sl.length > 0 ? sl[sl.length - 1] : null;
    const maxSeaLevelAnomaly =
      sl.length > 0 ? sl.reduce((a, b) => (b.value > a.value ? b : a)) : null;
    const minSeaLevel =
      sl.length > 0 ? sl.reduce((a, b) => (b.value < a.value ? b : a)) : null;
    const seaLevelRange =
      maxSeaLevelAnomaly && minSeaLevel
        ? maxSeaLevelAnomaly.value - minSeaLevel.value
        : null;

    // Red List
    const latestRLI = rli.length > 0 ? rli[rli.length - 1] : null;
    const earliestRLI = rli.length > 0 ? rli[0] : null;
    const rliDelta =
      latestRLI && earliestRLI ? latestRLI.value - earliestRLI.value : null;
    const rliTrend: "declining" | "improving" | "stable" =
      rliDelta !== null
        ? rliDelta < -0.005
          ? "declining"
          : rliDelta > 0.005
            ? "improving"
            : "stable"
        : "stable";

    return {
      latestEmission,
      earliestEmission,
      emissionGrowthRate,
      latestSST,
      earliestSST,
      tempDelta,
      peakSST,
      latestSeaLevel,
      maxSeaLevelAnomaly,
      seaLevelRange,
      latestRLI,
      earliestRLI,
      rliDelta,
      rliTrend,
    };
  }, [dashData]);

  // ── IntersectionObserver for act tracking ───────────────────────────────
  useEffect(() => {
    const refs = [act1Ref, act2Ref, act3Ref];
    const observers: IntersectionObserver[] = [];

    refs.forEach((ref, index) => {
      if (!ref.current) return;
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setActiveAct(index);
            }
          });
        },
        { threshold: 0.35, root: scrollRoot.current },
      );
      observer.observe(ref.current);
      observers.push(observer);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, [dashLoading]);

  // ── Loading / empty states ─────────────────────────────────────────────
  if (dashLoading) {
    return (
      <section className="relative flex min-h-screen w-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div
            className="h-10 w-10 animate-spin rounded-full border-2 border-t-transparent"
            style={{
              borderColor: `${MAGMA.orange} transparent ${MAGMA.magenta} ${MAGMA.deepPurple}`,
            }}
          />
          <p className="text-xs tracking-[0.3em] uppercase text-neutral-500 animate-pulse">
            Compiling narrative...
          </p>
        </div>
      </section>
    );
  }

  if (!hasAnyData) {
    return (
      <section className="relative flex min-h-[60vh] w-full items-center justify-center">
        <p className="text-sm text-neutral-600">
          No climate or SDG data available for this territory.
        </p>
      </section>
    );
  }

  // ── Chart titles by act ────────────────────────────────────────────────
  const chartTitles = [
    "Emissions & Ocean Warming",
    "Sea Level Anomalies",
    "Red List Index — SDG 15.5.1",
  ];
  const chartSubtitles = [
    "GHG per capita (bars) overlaid with sea surface temperature anomaly (line)",
    "Annual mean sea level deviation from historical baseline",
    "1.0 = no threatened species · 0.0 = all species extinct",
  ];
  const actColors = [MAGMA.orange, MAGMA.magenta, MAGMA.yellow];

  return (
    <section className="narrative-section relative w-full">
      {/* ── Decorative gradient separator ── */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 h-px w-2/3"
        style={{
          background: `linear-gradient(90deg, transparent, ${MAGMA.magenta}, ${MAGMA.orange}, ${MAGMA.yellow}, ${MAGMA.orange}, ${MAGMA.magenta}, transparent)`,
        }}
      />

      {/* ── Narrative Header ── */}
      <div className="narrative-header px-8 pt-24 pb-12 md:px-16 lg:px-24">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.3em] text-neutral-500">
          The Pacific Climate in Three Acts
        </p>
        <h2 className="font-display text-4xl font-black tracking-tight text-white md:text-5xl lg:text-6xl">
          The{" "}
          <span
            style={{
              background: `linear-gradient(135deg, ${MAGMA.orange}, ${MAGMA.magenta})`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            {countryName}
          </span>{" "}
          Report
        </h2>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-neutral-400">
          How greenhouse gas emissions, rising ocean temperatures, swelling
          seas, and declining biodiversity are converging to reshape the future
          of <span className="text-neutral-200 font-medium">{countryName}</span>
          .
        </p>

        {/* Act progress indicator */}
        <div className="mt-8 flex items-center gap-3">
          <ActPip active={activeAct >= 0} color={MAGMA.orange} />
          <div className="h-px w-8 bg-neutral-800" />
          <ActPip active={activeAct >= 1} color={MAGMA.magenta} />
          <div className="h-px w-8 bg-neutral-800" />
          <ActPip active={activeAct >= 2} color={MAGMA.yellow} />
        </div>
      </div>

      {/* ── Two-column scrollytelling layout ── */}
      <div className="narrative-columns">
        {/* LEFT: Scrolling narrative prose */}
        <div className="narrative-prose-column">
          {/* ═══ ACT 1: THE WARMING WATERS ═══ */}
          <div ref={act1Ref} className="narrative-act" data-act="1">
            <div
              className="narrative-act-label"
              style={{ color: MAGMA.orange }}
            >
              Act I
            </div>
            <h3
              className="narrative-act-title"
              style={{
                background: `linear-gradient(135deg, ${MAGMA.orange}, ${MAGMA.yellow})`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              The Warming Waters
            </h3>

            <p className="narrative-paragraph">
              The story of climate change in the Pacific begins not with rising
              seas, but with what we burn. Every tonne of greenhouse gas
              released into the atmosphere traps a little more heat and the
              ocean absorbs the vast majority of it.
            </p>

            {metrics.latestEmission && (
              <p className="narrative-paragraph">
                In{" "}
                <NarrativeHighlight color={MAGMA.deepPurple}>
                  {metrics.latestEmission.year}
                </NarrativeHighlight>
                , {countryName} recorded per-capita greenhouse gas emissions of{" "}
                <NarrativeHighlight color={MAGMA.deepPurple}>
                  {metrics.latestEmission.value.toFixed(2)} tonnes CO₂e
                </NarrativeHighlight>
                .{" "}
                {metrics.emissionGrowthRate !== null && (
                  <>
                    {metrics.emissionGrowthRate > 0 ? (
                      <>
                        That's a{" "}
                        <NarrativeHighlight color={MAGMA.magenta}>
                          {metrics.emissionGrowthRate.toFixed(1)}% increase
                        </NarrativeHighlight>{" "}
                        since {metrics.earliestEmission?.year} — a trajectory
                        that compounds the warming pressure on surrounding
                        waters.
                      </>
                    ) : (
                      <>
                        That represents a{" "}
                        <NarrativeHighlight color="#4ade80">
                          {Math.abs(metrics.emissionGrowthRate).toFixed(1)}%
                          decrease
                        </NarrativeHighlight>{" "}
                        since {metrics.earliestEmission?.year}, though the
                        cumulative damage to ocean temperatures persists.
                      </>
                    )}
                  </>
                )}
              </p>
            )}

            {metrics.latestSST && (
              <p className="narrative-paragraph">
                The consequence is visible in the water itself. Sea surface
                temperatures around {countryName} have shifted by{" "}
                <NarrativeHighlight color={MAGMA.orange}>
                  {metrics.tempDelta !== null
                    ? `${metrics.tempDelta > 0 ? "+" : ""}${metrics.tempDelta.toFixed(2)}°C`
                    : "—"}
                </NarrativeHighlight>{" "}
                {metrics.earliestSST && <>since {metrics.earliestSST.year}</>}.{" "}
                {metrics.peakSST && (
                  <>
                    The most extreme anomaly recorded was{" "}
                    <NarrativeHighlight color={MAGMA.orange}>
                      {metrics.peakSST.value > 0 ? "+" : ""}
                      {metrics.peakSST.value.toFixed(2)}°C
                    </NarrativeHighlight>{" "}
                    in {metrics.peakSST.year}. Even fractions of a degree
                    reshape coral reef ecosystems, disrupt fish migration
                    patterns, and intensify cyclone formation.
                  </>
                )}
              </p>
            )}

            <p className="narrative-paragraph narrative-aside">
              The chart to the right maps this dual reality, the emissions we
              produce (in purple) against the warming we receive (in orange).
              Notice how they track together.
            </p>
          </div>

          {/* ═══ ACT 2: THE RISING TIDE ═══ */}
          <div ref={act2Ref} className="narrative-act" data-act="2">
            <div
              className="narrative-act-label"
              style={{ color: MAGMA.magenta }}
            >
              Act II
            </div>
            <h3
              className="narrative-act-title"
              style={{
                background: `linear-gradient(135deg, ${MAGMA.magenta}, ${MAGMA.orange})`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              The Rising Tide
            </h3>

            <p className="narrative-paragraph">
              Warm water expands. Ice sheets melt. These two forces are
              conspiring to push the ocean surface higher, centimetre by
              irreversible centimetre. For Pacific island nations, this isn't
              abstract... it's an existential threat measured at the shoreline.
            </p>

            {metrics.maxSeaLevelAnomaly && (
              <p className="narrative-paragraph">
                The highest recorded sea level anomaly near {countryName}{" "}
                reached{" "}
                <NarrativeHighlight color={MAGMA.magenta}>
                  {metrics.maxSeaLevelAnomaly.value > 0 ? "+" : ""}
                  {metrics.maxSeaLevelAnomaly.value.toFixed(3)} meters
                </NarrativeHighlight>{" "}
                in {metrics.maxSeaLevelAnomaly.year}.{" "}
                {metrics.seaLevelRange !== null && (
                  <>
                    Over the measured period, the total swing from lowest to
                    highest has been{" "}
                    <NarrativeHighlight color={MAGMA.magenta}>
                      {metrics.seaLevelRange.toFixed(3)}m
                    </NarrativeHighlight>
                    .
                  </>
                )}
              </p>
            )}

            {metrics.latestSeaLevel && (
              <p className="narrative-paragraph">
                As of {metrics.latestSeaLevel.year}, the sea level anomaly
                stands at{" "}
                <NarrativeHighlight color={MAGMA.magenta}>
                  {metrics.latestSeaLevel.value > 0 ? "+" : ""}
                  {metrics.latestSeaLevel.value.toFixed(3)}m
                </NarrativeHighlight>
                . What may seem small in absolute terms compounds into flooded
                taro crops, saltwater intrusion into freshwater lenses, and the
                slow erosion of inhabitable land.
              </p>
            )}

            <p className="narrative-paragraph narrative-aside">
              Observe the area chart: the gradient beneath the line represents
              the cumulative weight of water pressing against {countryName}'s
              coast. The trend line tells the story of a slow, relentless rise.
            </p>
          </div>

          {/* ═══ ACT 3: BIODIVERSITY ON THE BRINK ═══ */}
          <div ref={act3Ref} className="narrative-act" data-act="3">
            <div
              className="narrative-act-label"
              style={{ color: MAGMA.yellow }}
            >
              Act III
            </div>
            <h3
              className="narrative-act-title"
              style={{
                background: `linear-gradient(135deg, ${MAGMA.yellow}, ${MAGMA.orange})`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Biodiversity on the Brink
            </h3>

            <p className="narrative-paragraph">
              Warming oceans and rising seas don't just reshape geography, they
              reshape life. The IUCN Red List Index tracks how close an entire
              nation's species are to collective extinction, where{" "}
              <NarrativeHighlight color={MAGMA.yellow}>1.0</NarrativeHighlight>{" "}
              means no species are threatened and{" "}
              <NarrativeHighlight color={MAGMA.magenta}>0.0</NarrativeHighlight>{" "}
              means all species are extinct.
            </p>

            {metrics.latestRLI && (
              <p className="narrative-paragraph">
                {countryName}'s latest Red List Index sits at{" "}
                <NarrativeHighlight color={MAGMA.yellow}>
                  {metrics.latestRLI.value.toFixed(3)}
                </NarrativeHighlight>{" "}
                as of {metrics.latestRLI.year}.{" "}
                {metrics.rliTrend === "declining" &&
                  metrics.rliDelta !== null && (
                    <>
                      This is{" "}
                      <NarrativeHighlight color={MAGMA.magenta}>
                        {Math.abs(metrics.rliDelta).toFixed(3)} points lower
                      </NarrativeHighlight>{" "}
                      than the {metrics.earliestRLI?.year} baseline, meaning
                      species are accelerating towards extinction. Each fraction
                      of a point lost represents real species crossing from
                      vulnerable to endangered, from endangered to critically
                      so.
                    </>
                  )}
                {metrics.rliTrend === "improving" &&
                  metrics.rliDelta !== null && (
                    <>
                      Encouragingly, this is{" "}
                      <NarrativeHighlight color="#4ade80">
                        {metrics.rliDelta.toFixed(3)} points higher
                      </NarrativeHighlight>{" "}
                      than the {metrics.earliestRLI?.year} baseline, suggesting
                      conservation efforts may be making a difference.
                    </>
                  )}
                {metrics.rliTrend === "stable" && (
                  <>
                    The index has remained largely stable since{" "}
                    {metrics.earliestRLI?.year}, though stability at this level
                    still implies persistent threat to native species.
                  </>
                )}
              </p>
            )}

            {metrics.latestRLI && metrics.latestRLI.value < 0.7 && (
              <p className="narrative-paragraph">
                <span
                  className="inline-block rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest"
                  style={{
                    backgroundColor: `${MAGMA.magenta}22`,
                    color: MAGMA.magenta,
                    border: `1px solid ${MAGMA.magenta}44`,
                  }}
                >
                  Critical
                </span>{" "}
                At below 0.700, {countryName} has crossed the critical threshold
                line visible on the chart. This level indicates severe and
                accelerating biodiversity loss that may become irreversible
                without immediate intervention.
              </p>
            )}

            <p className="narrative-paragraph narrative-aside">
              The chart to the right traces {countryName}'s biodiversity health
              over time. The dashed line marks the critical threshold, where
              the pace of extinction becomes dangerously difficult to reverse.
            </p>
          </div>

          {/* ── Data Source Footer ── */}
          <div className="narrative-footer">
            <div
              className="mb-6 h-px w-full"
              style={{
                background: `linear-gradient(90deg, transparent, ${MAGMA.magenta}44, transparent)`,
              }}
            />
            <p className="text-[9px] uppercase tracking-[0.25em] text-neutral-600 leading-relaxed">
              Data sourced from the Pacific Community (SPC) Pacific Data Hub —
              Climate Change Indicators & SDG 15. All metrics are calculated
              from the most recent available observations. Red List Index
              follows IUCN SDG 15.5.1 methodology.
            </p>
          </div>
        </div>

        {/* RIGHT: Sticky chart column */}
        <div className="narrative-chart-column">
          <div className="narrative-chart-sticky">
            {/* Chart container with smooth transitions */}
            <div className="narrative-chart-wrapper">
              {/* Chart label */}
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h4
                    className="text-sm font-bold tracking-widest transition-colors duration-500"
                    style={{ color: actColors[activeAct] }}
                  >
                    {chartTitles[activeAct]}
                  </h4>
                  <p className="mt-1 text-[10px] tracking-wider text-neutral-500">
                    {chartSubtitles[activeAct]}
                  </p>
                </div>
                <div
                  className="h-2.5 w-2.5 rounded-full transition-all duration-500"
                  style={{
                    backgroundColor: actColors[activeAct],
                    boxShadow: `0 0 12px ${actColors[activeAct]}66`,
                  }}
                />
              </div>

              {/* Chart swap area */}
              <div className="narrative-chart-area">
                <div
                  className="narrative-chart-panel"
                  style={{
                    opacity: activeAct === 0 ? 1 : 0,
                    zIndex: activeAct === 0 ? 2 : 1,
                  }}
                >
                  <DualAxisChart
                    ghg={dashData.ghgEmission}
                    sst={dashData.seaSurfaceTemp}
                  />
                </div>
                <div
                  className="narrative-chart-panel"
                  style={{
                    opacity: activeAct === 1 ? 1 : 0,
                    zIndex: activeAct === 1 ? 2 : 1,
                  }}
                >
                  <SeaLevelChart data={dashData.seaLevel} />
                </div>
                <div
                  className="narrative-chart-panel"
                  style={{
                    opacity: activeAct === 2 ? 1 : 0,
                    zIndex: activeAct === 2 ? 2 : 1,
                  }}
                >
                  <RedListChart data={dashData.redListIndex} />
                </div>
              </div>

              {/* Summary stat for active act */}
              <div className="mt-4 flex items-baseline gap-3">
                {activeAct === 0 && metrics.latestEmission && (
                  <>
                    <span
                      className="font-display text-3xl font-black"
                      style={{ color: MAGMA.deepPurple }}
                    >
                      {metrics.latestEmission.value.toFixed(2)}
                    </span>
                    <span className="text-xs text-neutral-500">
                      t CO₂e/capita ({metrics.latestEmission.year})
                    </span>
                  </>
                )}
                {activeAct === 1 && metrics.maxSeaLevelAnomaly && (
                  <>
                    <span
                      className="font-display text-3xl font-black"
                      style={{ color: MAGMA.magenta }}
                    >
                      {metrics.maxSeaLevelAnomaly.value > 0 ? "+" : ""}
                      {metrics.maxSeaLevelAnomaly.value.toFixed(3)}
                    </span>
                    <span className="text-xs text-neutral-500">
                      m peak anomaly ({metrics.maxSeaLevelAnomaly.year})
                    </span>
                  </>
                )}
                {activeAct === 2 && metrics.latestRLI && (
                  <>
                    <span
                      className="font-display text-3xl font-black"
                      style={{ color: MAGMA.yellow }}
                    >
                      {metrics.latestRLI.value.toFixed(3)}
                    </span>
                    <span className="text-xs text-neutral-500">
                      Red List Index ({metrics.latestRLI.year})
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
export default function CountryDetail({
  countryCode,
  onBack,
}: CountryDetailProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const [coastData, setCoastData] = useState<GeoJsonFeatureCollection | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  // Dashboard data
  const [dashData, setDashData] = useState<DashboardData>({
    seaLevel: [],
    seaSurfaceTemp: [],
    ghgEmission: [],
    redListIndex: [],
  });
  const [dashLoading, setDashLoading] = useState(true);

  // State untuk Playback
  const [years, setYears] = useState<number[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const pictCode =
    ISO3_TO_PICT[countryCode.toLowerCase()] || countryCode.toUpperCase();

  // KUNCI SCROLL & PINCH ZOOM BAWAAN BROWSER
  useEffect(() => {
    // 1. Matiin scroll window
    document.body.style.overflow = "hidden";

    // 2. Cegah Safari/Chrome ngerespon pinch-zoom bawaan OS
    const preventDefaultTouch = (e: TouchEvent) => {
      if (e.touches.length > 1) e.preventDefault();
    };
    document.addEventListener("touchmove", preventDefaultTouch, {
      passive: false,
    });

    // 3. Bersihin gemboknya pas tombol "BACK" dipencet (modal ditutup)
    return () => {
      document.body.style.overflow = "unset";
      document.removeEventListener("touchmove", preventDefaultTouch);
    };
  }, []);

  // 1. Fetch Coastline GeoJSON Data
  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        const response = await fetch(
          `/data/countries/${countryCode.toLowerCase()}_coastlines.json`,
        );
        if (!response.ok)
          throw new Error(`HTTP error! status: ${response.status}`);
        const geoJson = (await response.json()) as GeoJsonFeatureCollection;

        if (!isMounted) return;

        const sortedFeatures: GeoJsonFeature[] = [...geoJson.features].sort(
          (a, b) => a.properties.year - b.properties.year,
        );
        const uniqueYears = Array.from(
          new Set(sortedFeatures.map((f) => Math.floor(f.properties.year))),
        ) as number[];

        setCoastData({ type: "FeatureCollection", features: sortedFeatures });
        setYears(uniqueYears);
        setCurrentIndex(0);
        setLoading(false);
      } catch (err) {
        if (isMounted) {
          console.error("Gagal load data:", err);
          setLoading(false);
        }
      }
    };

    fetchData();
    return () => {
      isMounted = false;
    };
  }, [countryCode]);

  // 2. Fetch Climate & SDG CSV data concurrently
  useEffect(() => {
    let isMounted = true;

    const parseClimateCSV = (
      rows: d3.DSVRowArray<string>,
      pict: string,
    ): ClimateDataPoint[] => {
      return rows
        .filter(
          (r) =>
            r["GEO_PICT"] === pict &&
            r["OBS_VALUE"] &&
            r["OBS_VALUE"].trim() !== "",
        )
        .map((r) => ({
          year: parseInt(r["TIME_PERIOD"] || "0", 10),
          value: parseFloat(r["OBS_VALUE"] || "0"),
        }))
        .filter((d) => !isNaN(d.year) && !isNaN(d.value))
        .sort((a, b) => a.year - b.year);
    };

    const fetchAll = async () => {
      try {
        const [slRaw, sstRaw, ghgRaw, rliRaw] = await Promise.all([
          d3.csv(CSV_PATHS.seaLevel),
          d3.csv(CSV_PATHS.seaSurfaceTemp),
          d3.csv(CSV_PATHS.ghgEmission),
          d3.csv(CSV_PATHS.redListIndex),
        ]);

        if (!isMounted) return;

        setDashData({
          seaLevel: parseClimateCSV(slRaw, pictCode),
          seaSurfaceTemp: parseClimateCSV(sstRaw, pictCode),
          ghgEmission: parseClimateCSV(ghgRaw, pictCode),
          redListIndex: parseClimateCSV(rliRaw, pictCode),
        });
        setDashLoading(false);
      } catch (err) {
        console.error("CSV load error:", err);
        if (isMounted) setDashLoading(false);
      }
    };

    fetchAll();
    return () => {
      isMounted = false;
    };
  }, [pictCode]);

  // 3. Setup D3 Canvas + INTERACTIVE ZOOM & PAN ENGINE
  useEffect(() => {
    if (
      !coastData ||
      !svgRef.current ||
      !mapContainerRef.current ||
      years.length === 0
    )
      return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Bersihin canvas

    const width = mapContainerRef.current.clientWidth;
    const height = mapContainerRef.current.clientHeight;

    const projection = d3
      .geoIdentity()
      .reflectY(true)
      .fitExtent(
        [
          [50, 50],
          [width - 50, height - 50],
        ],
        coastData as GeoJSON.FeatureCollection,
      );

    const pathGenerator = d3.geoPath().projection(projection);
    const colorScale = d3
      .scaleSequential(d3.interpolateMagma)
      .domain([years[years.length - 1] + 5, years[0] - 2]);

    // Bikin container grup utama (g) untuk nampung semua path pantai
    const g = svg.append("g").attr("class", "map-content");

    // ==========================================
    // MAGIC INTERACTIVE ZOOM & PAN BINDING
    // ==========================================
    const zoomBehavior = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 60])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoomBehavior);

    // Gambar garis pantai ke dalam grup (g) hasil zoom
    g.selectAll("path.coastline")
      .data(coastData.features, (d: unknown) =>
        (d as GeoJsonFeature).properties.year.toString(),
      )
      .enter()
      .append("path")
      .attr("class", "coastline")
      .attr("d", (d: unknown) => {
        const feature = d as GeoJsonFeature;
        return pathGenerator(feature as GeoJSON.Feature);
      })
      .attr("fill", "none")
      .attr("stroke", (d: unknown) => {
        const feature = d as GeoJsonFeature;
        return colorScale(Math.floor(feature.properties.year));
      })
      .attr("stroke-linejoin", "round")
      .attr("stroke-linecap", "round")
      .style("vector-effect", "non-scaling-stroke");
  }, [coastData, years]);

  // 4. Update Visual D3 berdasarkan Playback (Atur Opacity & Tebal Relatif)
  useEffect(() => {
    if (!coastData || years.length === 0 || !svgRef.current) return;

    const currentYear = years[currentIndex];
    const svg = d3.select(svgRef.current);

    svg
      .selectAll("path.coastline")
      .transition()
      .duration(250)
      .attr("opacity", (d: unknown) => {
        const feature = d as GeoJsonFeature;
        const y = Math.floor(feature.properties.year);
        if (y === currentYear) return 1;
        if (y < currentYear) return 0.25;
        return 0;
      })
      .attr("stroke-width", (d: unknown) => {
        const feature = d as GeoJsonFeature;
        const y = Math.floor(feature.properties.year);
        return y === currentYear ? 2.0 : 0.6;
      });
  }, [currentIndex, coastData, years]);

  // 5. Engine Auto-Play
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isPlaying && years.length > 0) {
      interval = setInterval(() => {
        setCurrentIndex((prev) => {
          if (prev >= years.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, years]);

  const countryName =
    COUNTRY_NAMES[countryCode.toLowerCase()] || countryCode.toUpperCase();
  const hasAnyData =
    dashData.seaLevel.length > 0 ||
    dashData.seaSurfaceTemp.length > 0 ||
    dashData.ghgEmission.length > 0 ||
    dashData.redListIndex.length > 0;

  return (
    <div
      ref={scrollContainerRef}
      className="h-screen w-full overflow-y-auto bg-neutral-950 select-none"
      onWheel={(e) => e.stopPropagation()} // 🛡️ Blokir bocoran scroll mouse
      onTouchMove={(e) => e.stopPropagation()} // 🛡️ Blokir bocoran gesekan jari
    >
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* SECTION 1: FULL-VIEWPORT MAP (100vh) */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <section className="relative flex h-screen w-full shrink-0">
        {/* BACK BUTTON */}
        <button
          onClick={onBack}
          className="absolute top-8 left-8 z-50 flex items-center gap-2 text-xs font-bold tracking-widest text-neutral-500 hover:text-white transition-colors"
        >
          <span className="text-xl">←</span> GLOBAL VIEW
        </button>

        {/* PETA MICRO */}
        <div
          ref={mapContainerRef}
          className="relative h-full w-[75%] border-r border-neutral-800 cursor-grab active:cursor-grabbing"
        >
          {loading ? (
            <div className="flex h-full w-full items-center justify-center text-xl text-neutral-600 animate-pulse">
              Compiling Spatial Data...
            </div>
          ) : (
            <svg ref={svgRef} className="h-full w-full drop-shadow-2xl" />
          )}

          {/* Navigasi panduan kecil di pojok kiri bawah map */}
          {!loading && (
            <div className="absolute bottom-6 left-8 text-[10px] tracking-wider text-neutral-600 pointer-events-none uppercase font-mono">
              Use Wheel/Pinch to Zoom • Click & Drag to Pan
            </div>
          )}

          {/* Indikator Tahun Gede */}
          {!loading && years.length > 0 && (
            <div className="pointer-events-none absolute right-12 top-12 font-display text-8xl font-black text-white opacity-10">
              {years[currentIndex]}
            </div>
          )}
        </div>

        {/* DATA PANEL (Right sidebar) */}
        <div className="flex h-full w-[25%] flex-col px-8 py-4 pt-20">
          <h2 className="mb-1 font-display text-4xl font-black text-white tracking-widest">
            {countryCode.toUpperCase()}
          </h2>
          <p className="mb-1 text-lg font-medium text-neutral-400">
            {countryName}
          </p>
          <p className="mb-8 text-xs uppercase tracking-widest text-neutral-500">
            Shoreline Degradation Analysis
          </p>

          {/* PLAYBACK CONTROLS */}
          <div className="mb-8 flex flex-col gap-4 rounded bg-neutral-900 p-6 border border-neutral-800">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold tracking-widest text-neutral-400">
                TIMELINE
              </h3>
              <span className="font-mono text-sm font-bold text-white">
                {years[currentIndex] || "---"}
              </span>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  if (currentIndex >= years.length - 1) setCurrentIndex(0);
                  setIsPlaying(!isPlaying);
                }}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-black hover:bg-neutral-300 transition-colors"
              >
                {isPlaying ? (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <rect x="6" y="4" width="4" height="16" />
                    <rect x="14" y="4" width="4" height="16" />
                  </svg>
                ) : (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                )}
              </button>

              <input
                type="range"
                min={0}
                max={years.length > 0 ? years.length - 1 : 0}
                value={currentIndex}
                onChange={(e) => {
                  setIsPlaying(false);
                  setCurrentIndex(Number(e.target.value));
                }}
                className="w-full accent-white"
              />
            </div>
          </div>

          {/* Scroll hint */}
          <div className="mt-auto flex flex-col items-center gap-2 pb-8">
            <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-600">
              Scroll down for climate dashboard
            </p>
            <div className="flex flex-col items-center animate-bounce">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#525252"
                strokeWidth="2"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* SECTION 2: DATA JOURNALISM — SCROLLYTELLING NARRATIVE */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <NarrativeSection
        dashData={dashData}
        dashLoading={dashLoading}
        hasAnyData={hasAnyData}
        countryName={countryName}
        pictCode={pictCode}
        scrollRoot={scrollContainerRef}
      />
    </div>
  );
}
