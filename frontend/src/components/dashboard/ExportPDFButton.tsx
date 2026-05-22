export default function ExportPDFButton() {
  const handleExport = () => {
    window.print();
  };

  return (
    <button
      onClick={handleExport}
      className="inline-flex items-center gap-2 rounded-xl border border-white/10
        bg-white/[0.03] px-5 py-2.5 text-sm font-medium text-slate-300
        transition-all hover:border-white/20 hover:bg-white/[0.06] hover:text-white
        print:hidden active:scale-[0.97]"
    >
      <svg
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25
             2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0
             0L7.5 12m4.5 4.5V3"
        />
      </svg>
      Export as PDF
    </button>
  );
}
