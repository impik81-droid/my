document.addEventListener("focusin", function(e) {
  if (e.target.tagName === "INPUT" && (e.target.inputMode === "decimal" || e.target.inputMode === "numeric")) {
    setTimeout(function() {
      try { e.target.setSelectionRange(e.target.value.length, e.target.value.length); } catch(x) {}
    }, 50);
  }
});
