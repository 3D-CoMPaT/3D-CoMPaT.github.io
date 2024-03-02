// Processing part names
var clean_part = /(_[0-9]+)/g;

function clean_part_name(part_name) {
  part_name = part_name.toLowerCase();
  return part_name.replace(clean_part, "");
}

// Chunking an array
function chunk(arr, len) {
  var chunks = [],
    i = 0,
    n = arr.length;

  while (i < n) {
    chunks.push(arr.slice(i, (i += len)));
  }

  return chunks;
}

// Defining highlighted and default colors/materials
const HIGHLIGHT_COLOR = [
  "#72A7CB",
  "#D38C9D",
  "#AB7CAE",
  "#E6CA99",
  "#521151",
  "#6A82AD",
  "#BA72A6",
  "#DBA59B",
  "#E2BE9A",
  "#6E94BC",
  "#8F92BC",
  "#CC739E",
  "#C8679F",
  "#D7999C",
  "#5E497F",
  "#DFB19B",
  "#72A7CB",
  "#D0809E",
  "#5A3770",
  "#809CC4",
  "#9D87B5",
  "#666F9D",
  "#625C8E",
  "#C8679F",
  "#562460",
];

// Defining a color attribution class
class MatColor {
  constructor(
    semantic_mode,
    high_semantic,
    show_all_parts,
    part_set,
    levels_map
  ) {
    this.id = 0;
    this.semantic_mode = semantic_mode;
    this.high_semantic = high_semantic;
    this.part_set = part_set;
    this.levels_map = levels_map;
    this.show_all_parts = show_all_parts;

    this.high_parts = {};
    Object.keys(this.part_set)
      .sort()
      .forEach((part, i) => (this.high_parts[part] = i));
  }

  idxToColor(idx) {
    return idx + (1 % HIGHLIGHT_COLOR.length);
  }

  lowPartToColor(part_name) {
    if (!this.high_semantic) {
      return this.idxToColor(this.part_set[part_name]);
    }
    let high_part = this.levels_map[part_name];
    return this.highPartToColor(high_part);
  }

  highPartToColor(part_name) {
    return this.idxToColor(this.high_parts[part_name]);
  }

  color(part_name) {
    if (this.show_all_parts) {
      return this.lowPartToColor(part_name);
    }

    if (part_name in this.part_set) {
      if (this.semantic_mode) {
        return 1;
      } else {
        return this.idxToColor(this.id++);
      }
    }
    return NaN;
  }

  reset() {
    this.id = 0;
  }
}
