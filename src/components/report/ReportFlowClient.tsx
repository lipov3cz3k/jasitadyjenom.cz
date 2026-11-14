"use client";

import dynamic from "next/dynamic";

// Browser only: the flow reads saved reporter details from localStorage on start
export const ReportFlowClient = dynamic(() => import("./ReportFlow"), {
  ssr: false,
  loading: () => <div className="h-96 animate-pulse rounded-xl border border-border bg-surface" />,
});
