

const cic = document.getElementById('new-content');
const addButton = document.getElementById('content-image-add');


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


addButton.addEventListener('click',addContentImage);