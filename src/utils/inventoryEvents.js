// A simple pub/sub event helper to keep inventory screens in sync
export const emitInventoryUpdate = () => {
  window.dispatchEvent(new Event("inventory-updated"));
};

export const onInventoryUpdate = (callback) => {
  window.addEventListener("inventory-updated", callback);
  return () => window.removeEventListener("inventory-updated", callback);
};