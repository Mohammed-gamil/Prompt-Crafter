import { useToasts } from '../../toast';

const TYPE_CONFIG = {
  success: { icon: '✓', cls: 'bg-green-950/95 border-green-700/60 text-green-200' },
  error:   { icon: '✕', cls: 'bg-red-950/95 border-red-700/60 text-red-200' },
  info:    { icon: 'ℹ', cls: 'bg-indigo-950/95 border-indigo-700/60 text-indigo-200' },
  warning: { icon: '⚠', cls: 'bg-yellow-950/95 border-yellow-700/60 text-yellow-200' },
} as const;

export default function ToastContainer() {
  const toasts = useToasts();

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col-reverse gap-2 items-center pointer-events-none">
      {toasts.map((t) => {
        const cfg = TYPE_CONFIG[t.type] ?? TYPE_CONFIG.info;
        return (
          <div
            key={t.id}
            className={`toast-enter flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-sm font-medium shadow-2xl backdrop-blur-md whitespace-nowrap ${cfg.cls}`}
          >
            <span className="text-base leading-none">{cfg.icon}</span>
            <span>{t.message}</span>
          </div>
        );
      })}
    </div>
  );
}
