import * as Plot from "@observablehq/plot";
import * as d3 from "d3";

export default async function() {
  const data = await d3.csv("data/penguins.csv", d3.autoType);
  return Plot.plot({
    inset: 10,
    height: 320,
    grid: true,
    className: "plot classtest",
    x: {
      ticks: 10,
      tickFormat: "~s",
      className: "axis-x"
    },
    y: {
      ticks: 10,
      className: "axis-y"
    },
    facet: {
      data,
      x: "sex",
      className: "facet"
    },
    fx: {
      className: "axis-fx"
    },
    marks: [
      Plot.frame({
        className: "frame"
      }),
      Plot.dot(data, Plot.binR({
        x: "body_mass_g",
        y: "culmen_length_mm",
        stroke: "species",
        fill: "species",
        fillOpacity: 0.1,
        className: "bin"
      }))
    ]
  });
}
