import { checkAuth } from "./auth.js";
import { checkAdmin } from "./auth.js";

document.addEventListener("DOMContentLoaded", async () => {
  const user = await checkAuth();
  if (!user) {
    return;
  }
  else {
    
  }




});