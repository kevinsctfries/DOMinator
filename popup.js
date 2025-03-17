document.addEventListener("DOMContentLoaded", () => {
  // CSS Editor button
  document.getElementById("openCssEditor").addEventListener("click", () => {
    window.location.href = "tools/css-editor/cssEditor.html";
  });

  // Element Grabber button
  document
    .getElementById("openElementGrabber")
    .addEventListener("click", () => {
      window.location.href = "tools/element-grabber/elementGrabber.html";
    });
});
