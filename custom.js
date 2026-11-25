function addCustom() {
  let n = prompt("Название своего упражнения:");
  if (!n || !n.trim()) return;
  n = n.trim();
  if (typeof ED === "undefined" || !ED) ED = [];
  ED.push({name: n, sets: 3, weight: 0, g: ""});
  render();
  toast("Добавлено: " + n);
}
