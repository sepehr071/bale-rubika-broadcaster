import { Toaster as Sonner } from 'sonner';

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      dir="rtl"
      theme="light"
      className="toaster group"
      position="bottom-center"
      richColors
      closeButton={false}
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-card group-[.toaster]:text-ink group-[.toaster]:border-border group-[.toaster]:shadow-floating font-sans',
          description: 'group-[.toast]:text-ink-2',
          actionButton:
            'group-[.toast]:bg-accent group-[.toast]:text-primary-foreground',
          cancelButton:
            'group-[.toast]:bg-surface-2 group-[.toast]:text-ink-2',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
