"use client";

import { useState } from "react";
import { api } from "@/lib/api-client";
import { CSV_DATASETS } from "@/lib/analytics/export";
import { IconDownload } from "@/components/ui";

export function ExportMenu({ analysisId }: { analysisId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <div className="flex items-center gap-1.5">
        <a href={api.exportUrl(analysisId, "json")} className="sp-btn sp-btn-ghost !py-1.5 text-[11.5px]" download>
          <IconDownload className="h-3.5 w-3.5" /> JSON
        </a>
        <button onClick={() => setOpen((o) => !o)} className="sp-btn sp-btn-ghost !py-1.5 text-[11.5px]">
          <IconDownload className="h-3.5 w-3.5" /> CSV ▾
        </button>
      </div>
      {open ? (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="sp-card absolute right-0 top-full z-20 mt-1.5 w-52 p-1.5 sp-rise">
            <div className="sp-label px-2 py-1 text-[9px]">Export dataset</div>
            {CSV_DATASETS.map((d) => (
              <a
                key={d}
                href={api.exportUrl(analysisId, "csv", d)}
                download
                onClick={() => setOpen(false)}
                className="block rounded-md px-2 py-1.5 text-[12px] capitalize text-mist-200 hover:bg-white/6 hover:text-white"
              >
                {d}
              </a>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
