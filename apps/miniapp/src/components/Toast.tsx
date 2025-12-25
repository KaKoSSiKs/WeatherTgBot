type ToastProps = {
  message: string;
};

export const Toast = ({ message }: ToastProps) => (
  <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-4 py-2 rounded-full shadow-lg text-sm">
    {message}
  </div>
);

