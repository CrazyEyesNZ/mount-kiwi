// js/modals.js (safer, page-agnostic)

import { getNoteForKey, saveNoteForKey, clearAllNotes } from "./order-service.js";

// DOM refs are resolved lazily so pages without the modal don't error.
let modal = null;
let textarea = null;
let saveBtn = null;
let clearBtn = null;
let closeBtn = null;
let initialized = false;

// Tracks which item is currently being edited
let activeKey = null;

function ensureRefs() {
  if (initialized) return true;
  modal = document.getElementById("notesModal");
  if (!modal) return false;

  textarea = modal.querySelector("textarea");
  saveBtn  = modal.querySelector("#saveNoteBtn");
  clearBtn = modal.querySelector("#clearNotesBtn");
  closeBtn = modal.querySelector("#closeModalBtn");

  // Attach listeners only if the modal exists on this page
  document.addEventListener("click", onIconClick);
  saveBtn?.addEventListener("click", onSave);
  clearBtn?.addEventListener("click", onClear);
  closeBtn?.addEventListener("click", closeModal);
  document.addEventListener("keydown", onEsc);

  initialized = true;
  return true;
}

function onIconClick(e) {
  const t = e.target;
  if (t && t.matches(".note-icon")) {
    const key = t.dataset.key;
    if (key) openModal(key);
  }
}

function onSave() {
  if (activeKey !== null && textarea) {
    saveNoteForKey(activeKey, textarea.value);
  }
  closeModal();
}

function onClear() {
  if (!confirm("Are you sure you want to clear all notes for this order?")) return;
  clearAllNotes();
  closeModal();
}

function onEsc(e) {
  if (e.key === "Escape" && modal && modal.style.display === "block") {
    closeModal();
  }
}

/** Open the notes modal for a given key */
export function openModal(key) {
  if (!ensureRefs()) return;  // no modal on this page
  activeKey = key;
  if (textarea) textarea.value = getNoteForKey(key) || "";
  modal.style.display = "block";
  document.body.classList.add("modal-open");
  if (textarea) textarea.focus();
}

/** Close the modal */
export function closeModal() {
  if (!modal) return;
  modal.style.display = "none";
  document.body.classList.remove("modal-open");
  activeKey = null;
}

/** Initialise (call on pages that actually include #notesModal) */
export function initModals() {
  ensureRefs(); // no-op if modal isn’t present
}
