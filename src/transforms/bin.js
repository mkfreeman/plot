import {bin as binner, cross, group} from "d3-array";
import {valueof, first, second, range, offsetRange, identity, maybeLabel, maybeTransform} from "../mark.js";

export function binX({x, ...options} = {}) {
  const [transform, y] = maybeNormalize(options, bin1(x, options));
  return {...options, transform, y, x1: maybeLabel(x0, x), x2: x1};
}

export function binY({y, ...options} = {}) {
  const [transform, x] = maybeNormalize(options, bin1(y, options));
  return {...options, transform, x, y1: maybeLabel(x0, y), y2: x1};
}

export function binR({x, y, ...options} = {}) {
  const [transform, r] = maybeNormalize(options, bin2(x, y, options));
  return {...options, transform, x: maybeLabel(xMid, x), y: maybeLabel(yMid, y), r};
}

export function bin({x, y, out, ...options} = {}) {
  const [transform, l] = maybeNormalize(options, bin2(x, y, options));
  return {...options, transform, x1: maybeLabel(x0, x), x2: x1, y1: maybeLabel(y0, y), y2: y1, [out]: l};
}

function bin1(value = identity, options = {}) {
  const {domain, thresholds, z} = options;
  return rebin(binof({value, domain, thresholds, z}), subset1, options);
}

// Here x and y may each either be a standalone value (e.g., a string
// representing a field name, a function, an array), or the value and some
// additional per-dimension binning options as an objects of the form {value,
// domain?, thresholds?}.
function bin2(x, y, options = {}) {
  const {domain, thresholds, z} = options;
  const binX = binof({domain, thresholds, value: first, ...maybeValue(x), z});
  const binY = binof({domain, thresholds, value: second, ...maybeValue(y), z});
  return rebin(
    data => cross(
      binX(data).filter(nonempty),
      binY(data).filter(nonempty).map(binset2),
      (x, y) => y(x)
    ),
    subset2,
    options
  );
}

function binof({value, domain, thresholds, z}) {
  return data => {
    const values = valueof(data, value);
    const bin = binner().value(i => values[i]);
    if (domain !== undefined) bin.domain(domain);
    if (thresholds !== undefined) bin.thresholds(thresholds);
    let bins = bin(range(data));
    if (z) {
      const Z = valueof(data, z);
      const newbins = [];
      for (const b of bins) {
        for (const [z, I] of group(b, i => Z[i])) {
          newbins.push(Object.assign(
            I,
            { a: data[I[0]] }, // or a reducer?
            { z, x0: b.x0, x1: b.x1 },
            I
          ));
        }
      }
      bins = newbins;
    }
    return bins;
  };
}

// When faceting, subdivides the given bins according to the facet indexes.
function rebin(bin, subset, {cumulative} = {}) {
  return (data, index) => {
    const B = bin(data);
    const binIndex = [];
    const binData = [];
    let k = 0;
    for (const facet of index) {
      let b = B.map(subset(facet));
      if (cumulative) b = accumulate(cumulative < 0 ? b.reverse() : b);
      b = b.filter(nonempty);
      binIndex.push(offsetRange(b, k));
      k = binData.push(...b);
    }
    return {data: binData, index: binIndex};
  };
}

function subset1(I) {
  I = new Set(I);
  return bin => {
    const subbin = bin.filter(i => I.has(i));
    return Object.assign([], bin.a, {z: bin.z, x0: bin.x0, x1: bin.x1}, subbin);
  };
}

function subset2(I) {
  I = new Set(I);
  return bin => {
    const subbin = bin.filter(i => I.has(i));
    return Object.assign([], bin.a, {z: bin.z, x0: bin.x0, x1: bin.x1, y0: bin.y0, y1: bin.y1}, subbin);
  };
}

function binset2(biny) {
  const y = new Set(biny);
  const {x0: y0, x1: y1} = biny;
  return binx => {
    const subbin = binx.filter(i => y.has(i));
    return Object.assign([], binx.a, {z: binx.z, x0: binx.x0, x1: binx.x1, y0, y1}, subbin);
  };
}

function accumulate(bins) {
  let sum = 0;
  return bins.map(({x0, x1, length}) => ({x0, x1, length: sum += length}));
}

function nonempty({length}) {
  return length > 0;
}

function x0(d) {
  return d.x0;
}

function x1(d) {
  return d.x1;
}

function y0(d) {
  return d.y0;
}

function y1(d) {
  return d.y1;
}

function xMid(d) {
  return (d.x0 + d.x1) / 2;
}

function yMid(d) {
  return (d.y0 + d.y1) / 2;
}

function length1({length}) {
  return length;
}

length1.label = "Frequency";

// Returns a channel definition that’s either the number of elements in the
// given bin (length2 above), or the same as a proportion of the total number of
// elements in the data scaled by k. If k is true, it is treated as 100 for
// percentages; otherwise, it is typically 1.
function maybeNormalizeLength1(normalize) {
  const k = normalize === true ? 100 : +normalize;
  if (!k) return [length1];
  let n; // set lazily by the transform
  const value = ({length}) => length * k / n;
  value.label = `Frequency${k === 100 ? " (%)" : ""}`;
  return [value, ({length}) => void (n = length)];
}

// If the bin length requires normalization (per binLength above), this wraps
// the specified transform to allow it.
function maybeNormalize({normalize, ...options} = {}, transform) {
  const [length, normalizeLength] = maybeNormalizeLength1(normalize);
  return [
    maybeTransform(options, normalizeLength
      ? (data, index) => (normalizeLength(data), transform(data, index))
      : transform),
    length
  ];
}

// This distinguishes between per-dimension options and a standalone value.
function maybeValue(value) {
  return typeof value === "object" && value && "value" in value ? value : {value};
}
