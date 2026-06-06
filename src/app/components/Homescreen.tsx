"use client";

import { useSearchParams } from "next/navigation";
import { HomescreenDesignA } from "@/app/components/homescreen/HomescreenDesignA";
import { HomescreenDesignB } from "@/app/components/homescreen/HomescreenDesignB";

/** Default: B. Compare with `/?design=a` or `/?design=b` */
export function Homescreen() {
  const searchParams = useSearchParams();
  const design = searchParams.get("design") === "a" ? "a" : "b";

  if (design === "a") {
    return <HomescreenDesignA />;
  }
  return <HomescreenDesignB />;
}
