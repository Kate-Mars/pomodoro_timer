import { Toaster as Sonner, type ToasterProps } from 'sonner';

function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      position="top-center"
      toastOptions={{
        classNames: {
          toast: 'panel !bg-popover !text-popover-foreground !border-border !rounded-md !shadow-xl',
          description: '!text-muted-foreground',
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
