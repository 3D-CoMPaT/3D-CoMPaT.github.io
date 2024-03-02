window.HELP_IMPROVE_VIDEOJS = false;

var INTERP_BASE = ["./static/samples"];
var OBJECTS_LIST = [
  "angle_canap",
  "bad_chair",
  "bag",
  "basket",
  "lounge_sofa",
  "seat",
  "sofa_chair",
];
OBJECTS_LIST.forEach((e) => {
  INTERP_BASE.push("./static/styles_shuffle/" + e);
});
var NUM_INTERP_FRAMES = { "./static/samples": 256 };
OBJECTS_LIST.forEach((e) => {
  NUM_INTERP_FRAMES["./static/styles_shuffle/" + e] = 50;
});
var WRAPPER_TO_FOLDER = {};
WRAPPER_TO_FOLDER["data-image-wrapper"] = "./static/samples";
OBJECTS_LIST.forEach((e) => {
  WRAPPER_TO_FOLDER["data-image-" + e + "-wrapper"] =
    "./static/styles_shuffle/" + e;
});
var SCROLLERS = ["data-image"];
OBJECTS_LIST.forEach((e) => {
  SCROLLERS.push("data-image-" + e);
});

function preloadInterpolationImages() {
  var interp_images = {};
  INTERP_BASE.forEach((file_folder) => {
    interp_images[file_folder] = {};
    for (var i = 0; i < NUM_INTERP_FRAMES[file_folder]; i++) {
      var path = file_folder + "/" + String(i) + ".jpg";
      interp_images[file_folder][i] = new Image();
      interp_images[file_folder][i].src = path;
    }
  });
  return interp_images;
}

function setInterpolationImage(i, wrapper_id, interp_images) {
  folder = WRAPPER_TO_FOLDER[wrapper_id];
  var image = interp_images[folder][i];
  image.ondragstart = function () {
    return false;
  };
  image.oncontextmenu = function () {
    return false;
  };
  $("#" + wrapper_id)
    .empty()
    .append(image);
}

var INTERP_IMAGES;

$(document).ready(function () {
  // Check for click events on the navbar burger icon
  $(".navbar-burger").click(function () {
    // Toggle the "is-active" class on both the "navbar-burger" and the "navbar-menu"
    $(".navbar-burger").toggleClass("is-active");
    $(".navbar-menu").toggleClass("is-active");
  });

  // Initialize all div with carousel class
  var carousels = bulmaCarousel.attach(".carousel-renders", {
    slidesToScroll: 1,
    slidesToShow: 3,
    loop: true,
    infinite: false,
    autoplay: false,
    autoplaySpeed: 3000,
  });
  carousels +
    bulmaCarousel.attach(".carousel-styles", {
      slidesToScroll: 1,
      slidesToShow: 2,
      loop: true,
      infinite: false,
      autoplay: false,
      autoplaySpeed: 3000,
    });

  // Loop on each carousel initialized
  for (var i = 0; i < carousels.length; i++) {
    // Add listener to  event
    carousels[i].on("before:show", (state) => {});
  }

  // Access to bulmaCarousel instance of an element
  var element = document.querySelector("#my-element");
  if (element && element.bulmaCarousel) {
    // bulmaCarousel instance is available as element.bulmaCarousel
    element.bulmaCarousel.on("before-show", function (state) {});
  }

  INTERP_IMAGES = preloadInterpolationImages();

  // Set up data sliders
  SCROLLERS.forEach((slider_name) => {
    $("#" + slider_name + "-slider").on("input", function (event) {
      setInterpolationImage(
        this.value,
        slider_name + "-wrapper",
        INTERP_IMAGES
      );
    });
    setInterpolationImage(0, slider_name + "-wrapper", INTERP_IMAGES);
    // $('#' + slider_name + '-slider').prop('max', NUM_INTERP_FRAMES - 1);
  });

  bulmaSlider.attach();
});
