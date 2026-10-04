// --- Firebase Initialization ---
import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, signOut, GoogleAuthProvider, onAuthStateChanged, setPersistence, browserSessionPersistence } from "firebase/auth";
import { getDatabase, ref as dbRef, push, get, serverTimestamp, onValue, off, remove, update } from "firebase/database";
import ImageKit from "imagekit-javascript";


// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAGFk12CE0pDjGW17nWJvB99W-Ytl3yd1o",
  authDomain: "natdziuadmin.firebaseapp.com",
  databaseURL: "https://natdziuadmin-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "natdziuadmin",
  storageBucket: "natdziuadmin.firebasestorage.app",
  messagingSenderId: "339554989054",
  appId: "1:339554989054:web:4f74c2a953f65df48ec6af",
  measurementId: "G-8NXY6RH4KE"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const provider = new GoogleAuthProvider();


const imagekit = new ImageKit({
  publicKey: "public_nlaLJjT4YJ94UMgjgp62jAPmkVo=",
  urlEndpoint: "https://ik.imagekit.io/natka/"
});


// --- DOM Elements ---
const cic = document.getElementById('new-content');
const addButton = document.getElementById('content-image-add');
const profilePic = document.getElementById('profile');
const preview = document.getElementById('preview');
const loginButton = document.getElementById('login-btn');
const tabSelected = document.getElementById('SelectedBtn');
const tabTatoo = document.getElementById('TatooBtn');
const tabSketches = document.getElementById('SketchesBtn');
const tabCredentials = document.getElementById('CredentialsBtn');

const fileInput = document.querySelector('#preview input[name="file"]');
const form = document.getElementById('uploadImage');
const submitButton = form.querySelector('button[type="submit"]');
const PltitleInput = document.getElementById('PLtitleInput');
const PldescInput = document.getElementById('PLdescriptionInput');
const EntitleInput = document.getElementById('ENtitleInput');
const EndescInput = document.getElementById('ENdescriptionInput');
const selectedTabH = document.getElementById('selected-tab');

// --- State ---
let currentListenerRef = null;
let selectedTab = "selected";


function detachPreviousListener() {
  if (currentListenerRef) {
    off(currentListenerRef);
    currentListenerRef = null;
  }
}

// --- Auth Management ---
async function setupAuthPersistence() {
  try {
    await setPersistence(auth, browserSessionPersistence);
  } catch (error) {
    console.error("❌ Failed to set persistence:", error);
  }
}

function onUserStateChanged(user) {
  if (user) {
    console.log("✅ User signed in:", user.displayName);
    profilePic.src = user.photoURL || "";
    loginButton.textContent = "Log out";

  } else {
    console.log("❌ No user signed in.");
    profilePic.src = "";
    loginButton.textContent = "Login with Google";
    //dataPlace.innerHTML = "";
  }
}

async function getImagekitAuth() {
  let user = auth.currentUser;
  const token = await user.getIdToken();
  const res = await fetch("https://natbackend.vercel.app/api/getSignature", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` }
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Failed to get ImageKit auth");
  }
  return data.data;
}


// --- Database write ---
async function getNextOrderNrInTab(selectedTab) {
  const imagesRef = dbRef(db, `webPage/${selectedTab}`);
  const snapshot = await get(imagesRef);
  const data = snapshot.val() || {};

  return Math.max(0, ...Object.values(data).map(item => item.orderNr ?? 0)) + 100;
}

async function writeUserImageAndDesc(imageData, plTitle, plDesc, enTitle, enDesc) {
  const user = auth.currentUser;
  if (!user) return Promise.reject("❌ Not logged in");

  const orderNr = await getNextOrderNrInTab(selectedTab);
  const imagesRef = dbRef(db, `webPage/${selectedTab}`);

  return push(
    imagesRef,
    { image: imageData, plTitle, plDesc, enTitle, enDesc, orderNr, timestamp: serverTimestamp() }
  );
}

function updateText(keyId) {
  const user = auth.currentUser;

  const item = document.getElementById(keyId);
  const newTitlePl = item.querySelector("#titlePl").textContent;
  const newDescPl = item.querySelector("#descPl").textContent;
  const newTitleEn = item.querySelector("#titleEn").textContent;
  const newDescEn = item.querySelector("#descEn").textContent;
  const newOrderNr = item.querySelector("#orderNr").textContent;

  try {
    const messageRef = dbRef(db, `webPage/${selectedTab}/${keyId}`);
    detachPreviousListener();
    update(messageRef, {
      plTitle: newTitlePl,
      plDesc: newDescPl,
      enTitle: newTitleEn,
      enDesc: newDescEn,
      orderNr: parseInt(newOrderNr)
    });

  }
  catch {
    console.log("❌ Could not send update content request");
  }
  console.log("✅ Sent update content request");

  reLoadUserImages();

}

async function updateImage(keyId) {
  const user = auth.currentUser;

  const item = document.getElementById(keyId);
  const newImage = item.querySelector('#uploadImage input[type="file"]').files[0];

  const uniqueName = `${newImage.name}_${Date.now()}`;
  const authParams = await getImagekitAuth();

  const res = await imagekit.upload({
    file: newImage,
    fileName: uniqueName,
    folder: `/${selectedTab}`,
    token: authParams.token,
    expire: authParams.expire,
    signature: authParams.signature
  });
  console.log('✅ Got URL:', res.url);

  const messageRef = dbRef(db, `webPage/${selectedTab}/${keyId}`);
  detachPreviousListener();
  currentListenerRef = messageRef;

  update(messageRef, { image: res.url });

  console.log('✅ Uploaded sucessfull');

  reLoadUserImages();

}

function deleteImage(keyId) {
  const user = auth.currentUser;
  const imageRef = dbRef(db, `webPage/${selectedTab}/${keyId}`);
  return remove(imageRef)
}

// --- Database read ---

function sortByOrder([, a], [, b]) {
  if (a.orderNr == null) return 1;
  if (b.orderNr == null) return -1;
  return b.orderNr - a.orderNr;
}

function reLoadUserImages() {
  const user = auth.currentUser;
  cic.innerHTML = "";

  const imagesRef = dbRef(db, `webPage/${selectedTab}`);

  detachPreviousListener();
  currentListenerRef = imagesRef;

  onValue(imagesRef, (snapshot) => {
    const data = snapshot.val();
    if (!data) {
      console.log('❌ No data found.');
      return;
    }

    Object.entries(data)
      .sort(sortByOrder)
      .map(([keyId, { image, plTitle, plDesc, enTitle, enDesc, orderNr }]) =>
        createContentImageElement(keyId, image, plTitle, plDesc, enTitle, enDesc, orderNr));
  });

}

// --- General ---

function login() {
  const user = auth.currentUser;
  if (!user) signInWithPopup(auth, provider).catch(console.error);
  else signOut(auth).catch(console.error);
}

function updateTab(newTab) {
  selectedTab = newTab;
  selectedTabH.innerHTML = newTab;
  reLoadUserImages();
}

function createContentImageElement(keyId, cImage, plTitle, plDesc, enTitle, enDesc, nrOrder) {
  const wrapper = document.createElement("div");
  wrapper.className = "content-image";
  wrapper.id = keyId;

  const imgDiv = document.createElement("div");
  imgDiv.className = "img";
  const form = document.createElement("form");
  form.id = "uploadImage";
  form.method = "post";
  form.enctype = "multipart/form-data";

  const input = document.createElement("input");
  input.name = "file";
  input.type = "file";
  input.accept = "image/jpeg, image/png";

  const saveImageBtn = document.createElement("button");
  saveImageBtn.textContent = "💾 Update Image";
  saveImageBtn.onclick = () => updateImage(keyId);

  const image = document.createElement("img");
  image.src = cImage;
  image.style = "max-width:300px;max-height:250px"

  form.appendChild(input);
  imgDiv.appendChild(image);
  imgDiv.appendChild(form);
  imgDiv.appendChild(saveImageBtn);

  const textDiv = document.createElement("div");
  textDiv.className = "text";

  const titlePlDesc = document.createElement("span");
  titlePlDesc.textContent = "plTitle:";

  const titlePl = document.createElement("p");
  titlePl.id = "titlePl"
  titlePl.contentEditable = "true";
  titlePl.textContent = plTitle;

  const descPlDesc = document.createElement("span");
  descPlDesc.textContent = "plDesc:";

  const descPl = document.createElement("p");
  descPl.id = "descPl"
  descPl.contentEditable = "true";
  descPl.textContent = plDesc;

  const hr = document.createElement("hr");

  const titleEnDesc = document.createElement("span");
  titleEnDesc.textContent = "enTitle:";

  const titleEn = document.createElement("p");
  titleEn.id = "titleEn"
  titleEn.contentEditable = "true";
  titleEn.textContent = enTitle;

  const descEnDesc = document.createElement("span");
  descEnDesc.textContent = "enDesc:";

  const descEn = document.createElement("p");
  descEn.id = "descEn"
  descEn.contentEditable = "true";
  descEn.textContent = enDesc;

  const orderNrDesc = document.createElement("span");
  orderNrDesc.textContent = "nrOrder:";

  const orderNr = document.createElement("p");
  orderNr.id = "orderNr"
  orderNr.contentEditable = "true";
  orderNr.textContent = nrOrder;

  const saveBtn = document.createElement("button");
  saveBtn.textContent = "💾 Update Text";
  saveBtn.onclick = () => updateText(keyId);

  const deleteBtn = document.createElement("button");
  deleteBtn.textContent = "🗑️ Delete";
  deleteBtn.style = "margin:20px";
  deleteBtn.onclick = () => deleteContentImage(keyId);

  textDiv.append(
    titlePlDesc,
    titlePl,
    descPlDesc,
    descPl,
    hr,
    titleEnDesc,
    titleEn,
    descEnDesc,
    descEn,
    orderNrDesc,
    orderNr,
    saveBtn,
    deleteBtn);

  wrapper.append(imgDiv, textDiv);

  cic.appendChild(wrapper)
}

function previewImage(file) {
  if (!file.type.startsWith('image/')) {
    preview.innerHTML = "Please select a valid image.";
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const img = document.getElementById('previewImg');
    img.src = e.target.result;
    img.style.maxWidth = "200px";
    img.style.maxHeight = "230px";
    preview.appendChild(img);
    fileInput.dataset.base64 = e.target.result;
  };

  reader.readAsDataURL(file);
}

function inputFile() {
  const file = fileInput.files[0];
  if (file) previewImage(file);
}

function clearInputs() {
  const img = document.getElementById('previewImg');
  img.src = "";
  fileInput.value = "";
  PltitleInput.value = "";
  PldescInput.value = "";
  EntitleInput.value = "";
  EndescInput.value = "";
}

async function submitFile() {
  const file = fileInput.files[0];
  const Pltitle = PltitleInput.value.trim();
  const Pldesc = PldescInput.value.trim();
  const Entitle = EntitleInput.value.trim();
  const Endesc = EndescInput.value.trim();

  if (!file) return alert("Please select a file");

  try {
    const uniqueName = `${file.name}_${Date.now()}`;
    const authParams = await getImagekitAuth();

    const res = await imagekit.upload({
      file: file,
      fileName: uniqueName,
      folder: `/${selectedTab}`,
      token: authParams.token,
      expire: authParams.expire,
      signature: authParams.signature
    });
    console.log('✅ Got URL:', res.url);
    writeUserImageAndDesc(res.url, Pltitle, Pldesc, Entitle, Endesc);

    console.log('✅ Uploaded sucessfull');

  } catch (err) {
    console.error("❌ Upload went wrong: " + err.message);
  }
}

function submitNew() {
  submitButton.disabled = true;
  submitButton.textContent = '⏳ Uploading...';

  submitFile().then(() => {
    clearInputs();
    submitButton.disabled = false;
    submitButton.textContent = '💾 Upload';

    reLoadUserImages();

  });

}

function deleteContentImage(keyId) {
  if (confirm("Confirm delete?")) deleteImage(keyId).then(() => {
    document.getElementById(keyId).remove();
    reLoadUserImages();
  });
}

// --- Event Handlers ---
async function setupEventListeners() {
  loginButton.addEventListener('click', login);
  addButton.addEventListener('click', reLoadUserImages);
  fileInput.addEventListener('change', inputFile);

  tabSelected.addEventListener('click', () => updateTab("selected"));
  tabTatoo.addEventListener('click', () => updateTab("tattoo"));
  tabSketches.addEventListener('click', () => updateTab("sketches"));
  tabCredentials.addEventListener('click', () => updateTab("credentials"));


  form.addEventListener('submit', (e) => {
    e.preventDefault();
    submitNew();

  });
}


// --- Initialization ---
async function init() {
  await setupAuthPersistence();
  onAuthStateChanged(auth, onUserStateChanged);
  setupEventListeners();
}

init();