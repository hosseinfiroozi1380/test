// js/app/projectInfo.js
import { showMessage } from "../utils/showMessage.js";
document.addEventListener("DOMContentLoaded", () => {
 const form = document.getElementById("projectInfoForm");
 const clearButton =
  document.getElementById("clearProjectInfo");
 const projectName =
  document.getElementById("projectName");
 const projectCode =
  document.getElementById("projectCode");
 const projectPhone =
  document.getElementById("projectPhone");
 const customerGroup =
  document.getElementById("customerGroup");
 const projectNameError =
  document.getElementById("projectNameError");
 const projectCodeError =
  document.getElementById("projectCodeError");
 const projectPhoneError =
  document.getElementById("projectPhoneError");
 const customerGroupError =
  document.getElementById("customerGroupError");
 function showError(input, errorElement) {
  input.classList.add(
   "project-input-error"
  );
  errorElement.style.display = "block";
 }
 function hideError(input, errorElement) {
  input.classList.remove(
   "project-input-error"
  );
  errorElement.style.display = "none";
 }
 function validateForm() {
  let isValid = true;
  if (projectName.value.trim() === "") {
   showError(
    projectName,
    projectNameError
   );
   isValid = false;
  } else {
   hideError(
    projectName,
    projectNameError
   );
  }
  if (projectCode.value.trim() === "") {
   showError(
    projectCode,
    projectCodeError
   );
   isValid = false;
  } else {
   hideError(
    projectCode,
    projectCodeError
   );
  }
  if (projectPhone.value.trim() === "") {
   showError(
    projectPhone,
    projectPhoneError
   );
   isValid = false;
  } else {
   hideError(
    projectPhone,
    projectPhoneError
   );
  }
  if (customerGroup.value === "") {
   showError(
    customerGroup,
    customerGroupError
   );
   isValid = false;
  } else {
   hideError(
    customerGroup,
    customerGroupError
   );
  }
  return isValid;
 }
 form.addEventListener(
  "submit",
  (event) => {
   event.preventDefault();
   if (!validateForm()) {
    return;
   }
   const projectData = {
    projectName:
     projectName.value.trim(),
    projectCode:
     projectCode.value.trim(),
    projectPhone:
     projectPhone.value.trim(),
    customerGroup:
     customerGroup.value,
    installationCost:
     document
      .getElementById("installationCost")
      .value
      .trim(),
    materialCost:
     document
      .getElementById("materialCost")
      .value
      .trim(),
    projectAddress:
     document
      .getElementById("projectAddress")
      .value
      .trim(),
    projectDescription:
     document
      .getElementById("projectDescription")
      .value
      .trim()
   };
   sessionStorage.setItem(
    "projectInfo",
    JSON.stringify(projectData)
   );
   sessionStorage.setItem(
    "projectInfoAccess",
    "true"
   );
   setTimeout(() => {
    showMessage(
     "اطلاعات پروژه با موفقیت ذخیره شد.",
     "success",
     2200
    );
    setTimeout(() => {
     window.location.href = "./index.html";
    }, 2450);

   }, 1000);
  }
 );
 clearButton.addEventListener(
  "click",
  () => {
   form.reset();
   sessionStorage.removeItem(
    "projectInfo"
   );
   hideError(
    projectName,
    projectNameError
   );
   hideError(
    projectCode,
    projectCodeError
   );
   hideError(
    projectPhone,
    projectPhoneError
   );
   hideError(
    customerGroup,
    customerGroupError
   );
  }
 );
 projectName.addEventListener(
  "input",
  () => {
   if (
    projectName.value.trim() !== ""
   ) {
    hideError(
     projectName,
     projectNameError
    );
   }
  }
 );
 projectCode.addEventListener(
  "input",
  () => {
   if (
    projectCode.value.trim() !== ""
   ) {
    hideError(
     projectCode,
     projectCodeError
    );
   }
  }
 );
 projectPhone.addEventListener(
  "input",
  () => {
   if (
    projectPhone.value.trim() !== ""
   ) {
    hideError(
     projectPhone,
     projectPhoneError
    );
   }
  }
 );
 customerGroup.addEventListener(
  "change",
  () => {
   if (
    customerGroup.value !== ""
   ) {
    hideError(
     customerGroup,
     customerGroupError
    );
   }
  }
 );
});