// Defining each renderer size
STATIC_RENDERER_SIZE = 128;
INTERACTIVE_RENDERER_SIZE = 600;

// Dimension of the unit cube to fit the model in
UNIT_CUBE_DIM = 50;

// Camera position
CAMERA_POS = [0, 80, 80];

// Defining default colors/materials
DEFAULT_OPACITY = 0.8;
HIGHLIGHTED_OPACITY = 0.6;

DEFAULT_COLOR = 0x686868;
DEFAULT_MAT = new THREE.MeshPhongMaterial({
  color: new THREE.Color(DEFAULT_COLOR),
  opacity: DEFAULT_OPACITY,
  specular: 0x444444,
  shininess: 0,
  transparent: true,
  side: THREE.FrontSide,
  depthWrite: false,
});

// Defining all materials
MAT_LIST = HIGHLIGHT_COLOR.map(
  (c) =>
    new THREE.MeshPhongMaterial({
      color: new THREE.Color(c),
      opacity: HIGHLIGHTED_OPACITY,
      specular: 0x444444,
      shininess: 30,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: true,
    })
);
MAT_LIST.unshift(DEFAULT_MAT);

// Low resolution mode flag
LOW_RES_MODE = false;

// Model scaling flag
SCALE_CENTER_MODEL = false;

// Configuring renderer
STATIC_RENDERER = new THREE.WebGLRenderer({
  alpha: true,
  antialias: !LOW_RES_MODE,
  logarithmicDepthBuffer: true,
});
STATIC_RENDERER.setSize(STATIC_RENDERER_SIZE, STATIC_RENDERER_SIZE);
if (LOW_RES_MODE) STATIC_RENDERER.setPixelRatio(window.devicePixelRatio * 0.75);

// Creating a scene
STATIC_SCENE = new THREE.Scene();
STATIC_SCENE.background = new THREE.Color(0xffffff);
STATIC_SCENE.add(new THREE.AmbientLight(0xffffff, 1));

// Enabling model caching
THREE.Cache.enabled = true;

// Fitting camera to object
function fit_camera(camera, object) {
  let bounding_box = new THREE.Box3();
  bounding_box.setFromObject(object);

  // Center the object on origin
  if (SCALE_CENTER_MODEL) {
    let bb_center = new THREE.Vector3();
    bounding_box.getCenter(bb_center);
    object.position.set(-bb_center.x, -bb_center.y, -bb_center.z);
  }

  // Fit the camera so that the object fills the view
  let bb_size = new THREE.Vector3();
  bounding_box.getSize(bb_size);

  let max_dim = Math.max(bb_size.x, bb_size.y, bb_size.y);
  let fov = camera.fov * (Math.PI / 180);
  let camera_z = Math.abs((max_dim / 2) * Math.tan(fov * 2));
  let camera_to_center_distance = camera_z / 2;

  // Tilt the camera slightly to view from the top
  camera.position.set(0, camera_to_center_distance, camera_to_center_distance);

  // Set the camera to look at the center of the object
  camera.lookAt(new THREE.Vector3(0, 0, 0));
}

// Fitting an object to the unit cube
function scale_obj(object, bounding_box) {
  let bb_size = new THREE.Vector3();
  bounding_box.getSize(bb_size);

  let max_dim = Math.max(bb_size.x, bb_size.y, bb_size.y);
  let k = UNIT_CUBE_DIM / max_dim;
  object.scale.set(k, k, k);
}

// Updating a mesh material
function update_mat(obj, new_mat) {
  new_mat.side = THREE.DoubleSide;
  if (obj.material instanceof Array) {
    for (var i = 0; i < obj.material.length; i++) obj.material[i] = new_mat;
  } else {
    obj.material = new_mat;
  }
}

// Loading a 3D model
function load_model(
  model_url,
  part_color_map,
  scene,
  on_load,
  fit_cam,
  static
) {
  // Fetch the appropriate loader given a model url
  let model_ext = model_url.split(".").at(-1);
  let model_loader = null;
  switch (model_ext) {
    case "fbx":
      model_loader = new THREE.FBXLoader();
      break;
    case "gltf":
      model_loader = new THREE.GLTFLoader();
      break;
    case "obj":
    default:
      return false;
  }
  let loaded_obj = [];
  let bounding_box = new THREE.Box3();
  // var axesHelper = new THREE.AxesHelper(1)
  // scene.add(axesHelper)

  model_loader.load(
    model_url,
    (object) => {
      if (model_ext == "gltf") object = object.scene;
      bounding_box.setFromObject(object);
      object.traverse((child) => {
        if (child.isMesh) {
          update_mat(child, DEFAULT_MAT);
        }
      });

      object.traverse((child) => {
        let part_name = clean_part_name(child.name);
        let part_color = part_color_map.color(part_name);
        let part_mat = MAT_LIST[part_color];
        loaded_obj.push(child);

        if (!isNaN(part_color)) {
          if (child.isMesh) {
            update_mat(child, part_mat);
          } else {
            child.traverse((grandchild) => {
              if (grandchild.isMesh) {
                update_mat(grandchild, part_mat);
              }
            });
          }
        }
      });
      // Adding the model to the scene
      scene.add(object);

      // Scaling the object
      if (SCALE_CENTER_MODEL) scale_obj(object, bounding_box);

      // Moving the camera to the object
      fit_cam(object);

      // Calling the on_load function
      on_load();

      part_color_map.reset();

      // Destroying all meshes
      if (static)
        loaded_obj.forEach((obj) => {
          if (obj.isMesh) {
            obj.geometry.dispose();
          }
          scene.remove(obj);
          obj.clear();
        });
    },
    (xhr) => {
      // if (xhr.loaded == xhr.total) {
      //     INDICATE PROGRESS
      // }
    },
    (error) => {
      console.log("Error on: ", model_url);
      console.log("Error: ", error);
    }
  );

  return true;
}

// Magning active/inactive render views
ACTIVE_VIEWS = [];

function queue_view(model_id) {
  ACTIVE_VIEWS.push(model_id);
}

function dequeue_view(model_id) {
  ACTIVE_VIEWS = ACTIVE_VIEWS.filter((o) => o !== model_id);
}

function is_view_queued(model_id) {
  return ACTIVE_VIEWS.includes(model_id);
}

// Rendering a static view
function render_static(model_url, part_color_map, on_load) {
  let camera = new THREE.PerspectiveCamera();
  camera.position.set(CAMERA_POS[0], CAMERA_POS[1], CAMERA_POS[2]);

  let controls = new THREE.OrbitControls(camera, STATIC_RENDERER.domElement);
  controls.enableDamping = true;
  controls.target.set(0, 1, 0);

  // Loading an FBX model
  return load_model(
    model_url,
    part_color_map,
    STATIC_SCENE,
    () => {
      STATIC_RENDERER.render(STATIC_SCENE, camera);

      // Triggering the UI callback
      on_load(STATIC_RENDERER.domElement.toDataURL());

      // Disposing of all objects
      controls.dispose();
    },
    (obj) => fit_camera(camera, obj),
    true
  );
}

// Rendering an interactive view
function render_interactive(model_url, model_id, part_color_map) {
  let scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffffff);

  //let light = new THREE.PointLight();
  //light.position.set(CAMERA_POS[0], CAMERA_POS[1], CAMERA_POS[2]);
  //scene.add(light);

  let ambientLight = new THREE.AmbientLight(0xffffff);
  scene.add(ambientLight);

  //var axesHelper = new THREE.AxesHelper(1)
  //axesHelper.setColors(0xff0000, 0x0000ff, 0x00ff00)
  //scene.add(axesHelper)

  let camera = new THREE.PerspectiveCamera();
  camera.position.set(CAMERA_POS[0], CAMERA_POS[1], CAMERA_POS[2]);

  let renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: !LOW_RES_MODE,
    logarithmicDepthBuffer: true,
  });
  renderer.setSize(INTERACTIVE_RENDERER_SIZE, INTERACTIVE_RENDERER_SIZE);

  let controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.target.set(0, 0, 0);

  // Loading an FBX model
  load_model(
    model_url,
    part_color_map,
    scene,
    () => {},
    (obj) => fit_camera(camera, obj),
    false
  );

  function animate() {
    if (is_view_queued(model_id)) {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    } else {
      // Disposing of all objects
      light.dispose();
      ambientLight.dispose();
      controls.dispose();
      renderer.dispose();
    }
  }

  return [animate, renderer.domElement];
}
