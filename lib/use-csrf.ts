"use client";

import { useEffect, useState } from "react";
import { getCsrfToken } from "@/lib/csrf-client";

export function useCsrfToken() {
  const [csrf, setCsrf] = useState("");

  useEffect(() => {
    setCsrf(getCsrfToken());
  }, []);

  return csrf;
}
