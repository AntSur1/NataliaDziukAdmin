// --- Firebase Initialization ---
import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, signOut, GoogleAuthProvider, onAuthStateChanged, setPersistence, browserSessionPersistence} from "firebase/auth";
import { getDatabase, ref as dbRef, push, serverTimestamp, onValue, off, remove, update} from "firebase/database";
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
const fileInput = document.querySelector('#preview input[name="file"]');
const form = document.getElementById('uploadImage');
const submitButton = form.querySelector('button[type="submit"]');
const PltitleInput = document.getElementById('PLtitleInput');
const PldescInput = document.getElementById('PLdescriptionInput');
const EntitleInput = document.getElementById('ENtitleInput');
const EndescInput = document.getElementById('ENdescriptionInput');


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

async function getImagekitAuth(){
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

function writeUserImageAndDesc(imageData, PLtitle, PLDesc, ENtitle, ENDesc) {
  const user = auth.currentUser;
  if (!user) return Promise.reject("Not logged in");
  const imagesRef = dbRef(db, `users/${user.uid}/images`);
  return push(imagesRef, { image: imageData, PLtitle, PLDesc, ENtitle, ENDesc, timestamp: serverTimestamp() });
}

// --- General ---

function login() {
  const user = auth.currentUser;
  if (!user) signInWithPopup(auth, provider).catch(console.error);
  else signOut(auth).catch(console.error);
}

function createContentImageElement() {
  const wrapper = document.createElement("div");
  wrapper.className = "content-image";

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

  form.appendChild(input);
  imgDiv.appendChild(form);

  const textDiv = document.createElement("div");
  textDiv.className = "text";

  const titlePl = document.createElement("p");
  titlePl.contentEditable = "true";
  titlePl.textContent = "TitlePl";

  const descPl = document.createElement("p");
  descPl.contentEditable = "true";
  descPl.textContent =
    "Piwnica\nObraz wykonany farbami akrylowymi na papierze, przedstawiający piwnicę starego, opuszczonego domu.";

  const hr = document.createElement("hr");

  const titleEn = document.createElement("p");
  titleEn.contentEditable = "true";
  titleEn.textContent = "TitleEn";

  const descEn = document.createElement("p");
  descEn.contentEditable = "true";
  descEn.textContent =
    "Piwnica\nObraz wykonany farbami akrylowymi na papierze, przedstawiający piwnicę starego, opuszczonego domu.";

  const saveBtn = document.createElement("button");
  saveBtn.textContent = "Save";

  textDiv.append(titlePl, descPl, hr, titleEn, descEn, saveBtn);

  wrapper.append(imgDiv, textDiv);

  return wrapper;
}

function addContentImage(){
  let newContentImage = createContentImageElement();
  cic.appendChild(newContentImage)
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
    img.style.maxHeight = "250px";
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
      folder: "/nati",
      token: authParams.token,
      expire: authParams.expire,
      signature: authParams.signature
    });
    console.log('✅ Got URL:', res.url);
    writeUserImageAndDesc(res.url, Pltitle, Pldesc, Entitle, Endesc );
    console.log('✅ Uploaded sucessfull');

  } catch (err) {
    console.error("❌ Upload went wrong: " + err.message);
  }
}

function submitNew(){
  submitButton.disabled = true;
  submitButton.textContent = 'Uploading...';

  submitFile().then(() => { 
    clearInputs();
    submitButton.disabled = false;
    submitButton.textContent = 'Upload';
  });
}


// --- Event Handlers ---
async function setupEventListeners() {
  loginButton.addEventListener('click', login);
  addButton.addEventListener('click', addContentImage);
  fileInput.addEventListener('change', inputFile);

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