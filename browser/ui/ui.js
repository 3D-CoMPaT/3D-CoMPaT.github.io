/* General parameters
==================================== */
METADATA_FOLDER = "./metadata/";

/* Global metadata containers
==================================== */
PART_MAP = null;
MODELS = null;
CLASSES = null;

// Semantic levels
LEVELS = null;
CURRENT_LEVELS = null;
LEVELS_INVERTED = null;

// Mapping model_code => model_id (for models having the selected part)
REVERSE_MODELS_MAP = null;

ACTIVE_COUNT = 0;

/* UI State
==================================== */
// Selected part/class
SELECTED_PART = null;
SELECTED_CLASS = null;

// Filter by model code
FILTER_CODE = null;

// Number of models to load per page
PAGE_SIZE = 10;

// Semantic/instance mode
SEMANTIC_MODE = true;
HIGH_SEMANTIC = false;

// Showing all parts status
SHOW_ALL_PARTS = true;

// Definition of permanent events
EVENTS_DEFINED = false;

// Filtering THREE.JS warnings
js_warn = console.warn;
console.warn = (str) => {
  if (!str.startsWith("THREE")) {
    js_warn(str);
  }
};

$.when(
  $.getJSON(`${METADATA_FOLDER}state.json`, (o) => {
    CLASSES = o["loaded_classes"];
  }),
  $.getJSON(`${METADATA_FOLDER}levels.json`, (o) => {
    LEVELS = o;
  })
).then(() => {
  init_classes();
});

// Get the higher semantic part associated with "part_name"
function get_semantic_part(part_name) {
  if (part_name in CURRENT_LEVELS) return CURRENT_LEVELS[part_name];
  return part_name;
}

// Initialize categories
function init_classes() {
  CLASSES.sort();

  // Defining selected class
  if (SELECTED_CLASS == null) {
    SELECTED_CLASS = CLASSES[0];
  }

  SELECTED_CLASS = SELECTED_CLASS.replace(" ", "_");
  // Revert the LEVELS map
  CURRENT_LEVELS = LEVELS[SELECTED_CLASS];
  LEVELS_INVERTED = {};
  Object.entries(CURRENT_LEVELS).forEach((entry) => {
    [part_name, high_part_name] = entry;
    if (high_part_name in LEVELS_INVERTED)
      LEVELS_INVERTED[high_part_name].push(part_name);
    else LEVELS_INVERTED[high_part_name] = [part_name];
  });

  // Loading matching part/models data
  $.when(
    $.getJSON(`${METADATA_FOLDER}${SELECTED_CLASS}_partmap.json`, (o) => {
      PART_MAP = o;
    }),
    $.getJSON(`${METADATA_FOLDER}${SELECTED_CLASS}_models.json`, (o) => {
      MODELS = o;
    })
  ).then(() => {
    if (SEMANTIC_MODE && HIGH_SEMANTIC) {
      // Remapping MODELS and PART_MAP using semantic levels
      let new_part_map = {};
      Object.entries(PART_MAP).forEach((entry) => {
        [part_name, model_ids] = entry;
        let new_part_name = get_semantic_part(part_name);

        // Adding to new part map
        if (new_part_name in new_part_map)
          new_part_map[new_part_name].push(model_ids);
        else new_part_map[new_part_name] = model_ids;
      });
      PART_MAP = new_part_map;
    }
    $(document).ready(init);
  });
}

// Updating the reverse map
function update_reverse_map() {
  REVERSE_MODELS_MAP = {};
  Object.entries(MODELS).forEach((entry) => {
    [id, data] = entry;

    // Only add models containing the selected parts
    data["part_list"].forEach((part) => {
      part_name = clean_part_name(part);
      if (SEMANTIC_MODE && HIGH_SEMANTIC)
        part_name = get_semantic_part(part_name);

      if (part_name == SELECTED_PART) {
        REVERSE_MODELS_MAP[data["code"]] = id;
        return;
      }
    });
  });
}

// Filtering models
function filter_models() {
  let active_models = null;
  if (SHOW_ALL_PARTS) {
    active_models = Object.keys(MODELS);
  } else {
    active_models = PART_MAP[SELECTED_PART];
  }

  if (FILTER_CODE) {
    // Remove leading/trailing whitespaces
    FILTER_CODE = FILTER_CODE.trim();

    // Split code by spaces
    active_code = FILTER_CODE.split(" ");

    // Remove empty strings
    active_code = active_code.filter((code) => code.length > 0);

    // Only keep models that have one of the codes in it
    active_models = Object.keys(MODELS).filter((id) => {
      let model_code = MODELS[id]["code"];
      for (let i = 0; i < active_code.length; i++) {
        if (model_code.includes(active_code[i])) {
          return true;
        }
      }
      return false;
    });
  }

  ACTIVE_COUNT = active_models.length;
  return active_models;
}

// Refreshing pagination
function refresh_pages() {
  let filtered_models = filter_models();

  // Updating text fields
  update_text_fields();

  $("#no-results").attr("hidden", !(ACTIVE_COUNT == 0));

  // Configuring pagination
  $("#paginationButtons").pagination({
    dataSource: filtered_models,
    pageSize: PAGE_SIZE,
    className: "pagination",
    pageClassName: "page-item",
    callback: (model_ids, pagination) => {
      display_models(model_ids);
    },
  });
}

// Defining events that don't require a refresh
function define_once() {
  // Defining model search events
  let search_event = () => {
    FILTER_CODE = $("#modelCode").val();
    if (FILTER_CODE) {
      refresh_pages();
    }
  };
  $("#searchModel").on("click", () => search_event());
  $("#modelCode").on("keypress", (e) => {
    if (e.which === 13) {
      search_event();
    }
  });
  $("#clearSearch").on("click", () => {
    $("#modelCode").val("");
    if (FILTER_CODE) {
      FILTER_CODE = null;
      refresh_pages();
    }
  });

  $("#showAllParts").on("click", (e) => {
    $("#navbarParts").attr("disabled", !SHOW_ALL_PARTS);
    $("#legend-section").attr("hidden", SHOW_ALL_PARTS);

    if (!SHOW_ALL_PARTS) {
      SHOW_ALL_PARTS = true;
      $("#navbarParts").addClass("disabled");
    } else {
      SHOW_ALL_PARTS = false;
      $("#navbarParts").removeClass("disabled");
    }
    e.stopPropagation();
    init_classes();
  });

  $("#semanticSeg").on("click", () => {
    if (!SEMANTIC_MODE) {
      SEMANTIC_MODE = true;
      $("#showAllParts").attr("disabled", false);
      $("#semlevels-section").attr("hidden", false);
      $("#semanticSeg").attr("class", "dropdown-item bg-primary text-white");
      $("#instanceSeg").attr("class", "dropdown-item");
      init_classes();
    }
  });
  $("#instanceSeg").on("click", () => {
    if (SEMANTIC_MODE) {
      SEMANTIC_MODE = false;
      SHOW_ALL_PARTS = false;
      HIGH_SEMANTIC = false;

      $("#navbarParts").attr("disabled", false);
      $("#navbarParts").removeClass("disabled");

      $("#showAllParts").attr("disabled", true);
      $("#showAllParts").prop("checked", false);
      $("#legend-section").attr("hidden", true);

      $("#highlevelSem").attr("checked", false);
      $("#lowLevelSem").attr("checked", true);

      $("#semlevels-section").attr("hidden", true);
      $("#semanticSeg").attr("class", "dropdown-item");
      $("#instanceSeg").attr("class", "dropdown-item bg-primary text-white");
      init_classes();
    }
  });

  $("#lowLevelSem").on("click", () => {
    HIGH_SEMANTIC = !HIGH_SEMANTIC;
    init_classes();
  });
  $("#highlevelSem").on("click", () => {
    HIGH_SEMANTIC = !HIGH_SEMANTIC;
    init_classes();
  });
}

// Updating descriptive model count fields
function update_text_fields() {
  fields = [$("#part-occ-text"), $("#cat-text"), $("#filter-text")];

  // Show text field for field_id and hide the two others
  function show_field(field_id, field_text, extra_text = null) {
    // Hiding/revealing fields
    fields[field_id].attr("hidden", false);
    fields[(field_id + 1) % 3].attr("hidden", true);
    fields[(field_id + 2) % 3].attr("hidden", true);

    // Updating text
    $(fields[field_id].children()[0]).text(ACTIVE_COUNT);
    $(fields[field_id].children()[1]).text(field_text);

    if (FILTER_CODE) {
      let extra_field = $(fields[field_id].children()[2]);
      if (extra_text) {
        $("#hidden-part").text(extra_text);
        extra_field.attr("hidden", false);
      } else {
        extra_field.attr("hidden", true);
      }
    }
  }

  if (!SEMANTIC_MODE && FILTER_CODE) {
    show_field(2, FILTER_CODE, SELECTED_PART);
    return;
  }

  if (FILTER_CODE) {
    show_field(2, FILTER_CODE);
  } else if (SHOW_ALL_PARTS) {
    show_field(1, SELECTED_CLASS);
  } else {
    show_field(0, SELECTED_PART);
  }
}

// Initializing elements
function init() {
  function clear_list(dropdown_id) {
    $("#" + dropdown_id).empty();
  }
  function add_item(dropdown_id, is_selected, item_name) {
    if (is_selected) {
      item_cls = "dropdown-item bg-primary text-white";
    } else {
      item_cls = "dropdown-item";
    }
    let class_opt = `<li>
            <a class="${item_cls}" href="#" id="${dropdown_id}-${item_name}">${item_name}</a>
        </li>`;
    class_opt = $(class_opt);
    $("#" + dropdown_id).append(class_opt);
  }

  // Initializing selected part
  SELECTED_PART = Object.keys(PART_MAP).sort()[0];

  // Initializing the list of classes
  clear_list("classesList");
  CLASSES.forEach((class_name) => {
    add_item("classesList", class_name == SELECTED_CLASS, class_name);
  });
  $("#classesList li a").on("click", function () {
    SELECTED_CLASS = $(this).html();
    init_classes();
  });

  // Populating the list of parts
  clear_list("partsList");
  Object.keys(PART_MAP)
    .sort()
    .forEach((part_name, i) => {
      add_item("partsList", i == 0, part_name);
    });

  // Defining the part change event
  update_reverse_map();

  $("#partsList li a").on("click", function () {
    // Updating dropdowns
    $("#partsList-" + SELECTED_PART).attr("class", "dropdown-item");
    SELECTED_PART = $(this).html();
    $("#activePart").val(SELECTED_PART);
    $("#partsList-" + SELECTED_PART).attr(
      "class",
      "dropdown-item bg-primary text-white"
    );

    // Updating reverse map
    update_reverse_map();

    refresh_pages();
  });

  // Defining slider change events
  $("#iconSizeLabel").text(
    STATIC_RENDERER_SIZE + "x" + STATIC_RENDERER_SIZE + "px"
  );
  $("#iconSize").val(STATIC_RENDERER_SIZE);
  $("#iconSize").change(() => {
    STATIC_RENDERER_SIZE = $("#iconSize").val();
    STATIC_RENDERER.setSize(STATIC_RENDERER_SIZE, STATIC_RENDERER_SIZE);
    $("#iconSizeLabel").text(
      STATIC_RENDERER_SIZE + "x" + STATIC_RENDERER_SIZE + "px"
    );

    refresh_pages();
  });

  $("#itemCountLabel").text(PAGE_SIZE);
  $("#itemCount").val(PAGE_SIZE);
  $("#itemCount").change(() => {
    PAGE_SIZE = $("#itemCount").val();
    $("#itemCountLabel").text(PAGE_SIZE);

    refresh_pages();
  });

  // Defining events that don't require a refresh
  if (!EVENTS_DEFINED) {
    define_once();
    EVENTS_DEFINED = true;
  }

  // Initializing pagination
  refresh_pages();
}

// Compute the set of parts to filter for the current settings
function get_part_set() {
  // Defining the list of granular parts
  let part_set = {};
  let part_list = null;

  if (SEMANTIC_MODE) {
    if (HIGH_SEMANTIC) {
      if (SHOW_ALL_PARTS) {
        Object.keys(PART_MAP)
          .sort()
          .forEach((part_name) => {
            part_set[part_name] = LEVELS_INVERTED[part_name];
          });

        return part_set;
      } else if (SELECTED_PART in LEVELS_INVERTED) {
        part_list = LEVELS_INVERTED[SELECTED_PART];
      }
    } else if (SHOW_ALL_PARTS) {
      part_list = Object.keys(PART_MAP);
    }
  }

  if (part_list == null) part_list = [SELECTED_PART];

  part_list.sort();
  part_list.forEach((part, i) => (part_set[part] = i));

  return part_set;
}

// Computing a color map for the current settings
function color_map() {
  // Generate a part -> color index map
  return new MatColor(
    SEMANTIC_MODE,
    HIGH_SEMANTIC,
    SHOW_ALL_PARTS,
    get_part_set(),
    CURRENT_LEVELS
  );
}

// Generating a list of HTML legend entries
function gen_legend(part_names, part_color_map, part_filter = null) {
  let legend_html = [];

  // Adding a legend entry for each part in part_names
  part_names.sort().forEach((part_name) => {
    if (part_filter && !part_filter.has(part_name)) return;
    if (HIGH_SEMANTIC) {
      legend_color = part_color_map.highPartToColor(part_name);
    } else {
      legend_color = part_color_map.lowPartToColor(part_name);
    }
    legend_color = HIGHLIGHT_COLOR[legend_color - 1];
    legend_entry = `<div class="list-item col-sm legend-grp ms-1 me-1">
            <span class="square legend-col border rounded-2" style="background-color: ${legend_color};"></span>
            <span class="w-auto">${part_name}</span>
        </div>`;
    legend_html.push(legend_entry);
  });

  return legend_html;
}

// Generate legend rows by chunking gen_legend output
function gen_legend_rows(legend_blocks) {
  let legend_html = "";
  let row_length = 9;
  if (legend_blocks.length % row_length == 1) {
    if (row_length < legend_blocks.length) row_length += 1;
    else row_length -= 1;
  }

  chunk(legend_blocks, row_length).forEach((legend_chunk) => {
    legend_html += `<div class="list-wrapper row g-1 ps-4 pe-4 mb-1">`;
    legend_html += legend_chunk.join("\n");
    legend_html += `</div>`;
  });

  return legend_html;
}

// Adding a legend
function add_legend(part_names, part_color_map) {
  $("#legend-section").removeAttr("hidden");
  let legend_list = $("#legend-list");

  // Adding a legend entry for each part in part_names
  legend_list.empty();

  // Generating and adding the legend
  legend_rows = gen_legend(part_names, part_color_map);
  legend_list.append(gen_legend_rows(legend_rows));
}

// Displaying all models
function display_models(model_ids) {
  // Removing previous items
  $("#render-list").empty();
  $("#modal-list").empty();

  // Generate a part -> color index map
  let part_color_map = color_map();

  // Updating legend
  if (SHOW_ALL_PARTS) add_legend(Object.keys(PART_MAP), part_color_map);

  model_ids.forEach((id) => {
    // Generating HTML for the model
    model_html = get_model_html(id, part_color_map);
    model_render = model_html[0];
    model_modal = model_html[1];

    // Appending corresponding HTML code
    $("#render-list").append(model_render);
    $("#modal-list").append(model_modal);
  });

  // Initiating clipboard
  new ClipboardJS(".model-badge", {
    text: function (trigger) {
      return $(trigger).find(".model-badge-text").text().trim();
    },
  });
}

// Retrieving a model HTML
function get_model_html(model_id, part_color_map) {
  let model_url = MODELS[model_id]["model_url"];
  let model_name = MODELS[model_id]["code"];

  // DOM for the static render
  let poly9_url = MODELS[model_id]["poly9_url"];
  let model_render = `
        <div class="list-item col-sm-auto">
            <div class="bg-image hover-overlay ripple shadow-1-strong rounded ripple-surface-light"
                data-ripple-color="light">
                <div class="viewer-static" style="width:${STATIC_RENDERER_SIZE}px; height:${STATIC_RENDERER_SIZE}px;">
                    <img class="model-view" style="width:${STATIC_RENDERER_SIZE}px; height:${STATIC_RENDERER_SIZE}px;" hidden>
                    <div class="model-spinner spinner-border text-primary" role="status"></div>
                    <span id="badge_${model_id}" class="model-badge badge badge-primary" data-clipboard-target="#badge_${model_id}" hidden>
                        <i class="bi bi-box-arrow-up-right" onclick="window.open('${poly9_url}');"></i>
                        <div class="model-badge-text">${model_name}</div>
                    </span>
                </div>
                <a href="#!" data-mdb-toggle="modal" data-mdb-target="#modal_${model_id}">
                    <div class="modal-mask mask"></div>
                </a>
            </div>
        </div>`;
  model_render = $(model_render);
  // Show the badge on mouse over
  model_render.on("mouseover", function () {
    $(this).find(".model-badge")[0].removeAttribute("hidden");
  });
  // Hide the badge on mouse out
  model_render.on("mouseout", function () {
    $(this).find(".model-badge")[0].setAttribute("hidden", true);
  });

  // Creating the static view and appending
  let render_status = render_static(model_url, part_color_map, (base64) => {
    $(model_render.find(".model-view")).attr("src", base64);
    setTimeout(() => {
      model_render.find(".spinner-border")[0].remove();
      $(model_render.find(".model-view")).attr("hidden", false);
    }, 50);
  });
  if (!render_status) {
    $(model_render.find(".spinner-border")[0]).attr("class", "model-unloaded");
  }

  // Generate part filter from MODELS[model_id]["part_list"] depending on HIGH_SEMANTIC
  let part_list = MODELS[model_id]["part_list"];
  let part_filter = new Set();
  part_list.forEach((part_name) => {
    part_name = clean_part_name(part_name);
    if (HIGH_SEMANTIC) {
      part_filter.add(CURRENT_LEVELS[part_name]);
    } else {
      part_filter.add(part_name);
    }
  });

  // Generate HTML for the modal legend
  let legend_html = "";
  if (SHOW_ALL_PARTS) {
    let legend_rows = gen_legend(
      Object.keys(PART_MAP),
      part_color_map,
      part_filter
    );
    legend_html = gen_legend_rows(legend_rows);
  }

  // DOM for the dynamic render (in the modal)
  let model_modal = `
        <div class="modal fade" id="modal_${model_id}" tabindex="-1"
            style="display: none;"
            data-gtm-vis-first-on-screen-2340190_1302="98705"
            data-gtm-vis-total-visible-time-2340190_1302="100"
            data-gtm-vis-has-fired-2340190_1302="1"
            aria-hidden="true">
            <div class="modal-dialog modal-lg">
                <div class="modal-content p-2">
                    <div class="viewer-interactive mt-2 mb-2">
                    </div>

                    ${legend_html}

                    <div class="text-center py-3 mt-3">
                        <button type="button" class="btn btn-secondary" data-mdb-dismiss="modal">
                        Close
                        </button>
                    </div>
                </div>
            </div>
        </div>`;
  model_modal = $(model_modal);

  if (render_status) {
    // Configuring show/close event
    model_modal.on("shown.bs.modal", () => {
      // Creating the interactive view and appending
      let [animate_fn, dom_inter] = render_interactive(
        model_url,
        model_id,
        part_color_map
      );
      queue_view(model_id);
      $(dom_inter).attr(
        "style",
        `width: ${INTERACTIVE_RENDERER_SIZE}px; height: ${INTERACTIVE_RENDERER_SIZE}px; touch-action: none;`
      );
      model_modal.find(".viewer-interactive")[0].append(dom_inter);
      animate_fn();
    });

    model_modal.on("hidden.bs.modal	", () => {
      dequeue_view(model_id);
      model_modal.find("canvas")[0].remove();
    });
  }

  return [model_render, model_modal];
}
