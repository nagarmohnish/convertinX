export default function Footer() {
  return (
    <footer className="py-12 border-t border-border">
      <div className="max-w-[1280px] mx-auto px-6 flex flex-col items-center gap-4">
        <p className="text-[13px] text-text-4 text-center">
          Built with open-source models. Runs on your hardware.
        </p>
        <div className="flex items-center gap-3">
          <span className="px-2 py-0.5 rounded-md bg-surface-2 border border-border text-[11px] font-mono font-medium text-text-4">
            v1.0
          </span>
          <a
            href="https://github.com/nagarmohnish/convertinX"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[12px] text-text-4 hover:text-text-2 transition-colors"
          >
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
