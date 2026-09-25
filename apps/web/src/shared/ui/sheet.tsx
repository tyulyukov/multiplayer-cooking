import type { FC } from "react";
import * as React from "react";
import { cn } from "cn";
import { Dialog as SheetPrimitive } from "radix-ui";

import { Button } from "@/shared/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon } from "@hugeicons/core-free-icons";

type SheetProps = React.ComponentProps<typeof SheetPrimitive.Root>;

const Sheet: FC<SheetProps> = ({ ...props }) => {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />;
};

type SheetTriggerProps = React.ComponentProps<typeof SheetPrimitive.Trigger>;

const SheetTrigger: FC<SheetTriggerProps> = ({ ...props }) => {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
};

type SheetCloseProps = React.ComponentProps<typeof SheetPrimitive.Close>;

const SheetClose: FC<SheetCloseProps> = ({ ...props }) => {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />;
};

type SheetPortalProps = React.ComponentProps<typeof SheetPrimitive.Portal>;

const SheetPortal: FC<SheetPortalProps> = ({ ...props }) => {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />;
};

type SheetOverlayProps = React.ComponentProps<typeof SheetPrimitive.Overlay>;

const SheetOverlay: FC<SheetOverlayProps> = ({ className, ...props }) => {
  return (
    <SheetPrimitive.Overlay
      data-slot="sheet-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/10 duration-100 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className,
      )}
      {...props}
    />
  );
};

type SheetContentProps = React.ComponentProps<typeof SheetPrimitive.Content> & {
  side?: "top" | "right" | "bottom" | "left";
  showCloseButton?: boolean;
};

const SheetContent: FC<SheetContentProps> = ({
  className,
  children,
  side = "right",
  showCloseButton = true,
  ...props
}) => {
  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        data-side={side}
        className={cn(
          "fixed z-50 flex flex-col gap-4 bg-popover bg-clip-padding text-sm text-popover-foreground shadow-lg transition duration-200 ease-in-out data-[side=bottom]:inset-x-0 data-[side=bottom]:bottom-0 data-[side=bottom]:h-auto data-[side=bottom]:border-t data-[side=left]:inset-y-0 data-[side=left]:left-0 data-[side=left]:h-full data-[side=left]:w-3/4 data-[side=left]:border-r data-[side=right]:inset-y-0 data-[side=right]:right-0 data-[side=right]:h-full data-[side=right]:w-3/4 data-[side=right]:border-l data-[side=top]:inset-x-0 data-[side=top]:top-0 data-[side=top]:h-auto data-[side=top]:border-b data-[side=left]:sm:max-w-sm data-[side=right]:sm:max-w-sm data-open:animate-in data-open:fade-in-0 data-[side=bottom]:data-open:slide-in-from-bottom-10 data-[side=left]:data-open:slide-in-from-left-10 data-[side=right]:data-open:slide-in-from-right-10 data-[side=top]:data-open:slide-in-from-top-10 data-closed:animate-out data-closed:fade-out-0 data-[side=bottom]:data-closed:slide-out-to-bottom-10 data-[side=left]:data-closed:slide-out-to-left-10 data-[side=right]:data-closed:slide-out-to-right-10 data-[side=top]:data-closed:slide-out-to-top-10",
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <SheetPrimitive.Close data-slot="sheet-close" asChild>
            <Button variant="ghost" className="absolute top-3 right-3" size="icon-sm">
              <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
              <span className="sr-only">Close</span>
            </Button>
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Content>
    </SheetPortal>
  );
};

type SheetHeaderProps = React.ComponentProps<"div">;

const SheetHeader: FC<SheetHeaderProps> = ({ className, ...props }) => {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex flex-col gap-0.5 p-4", className)}
      {...props}
    />
  );
};

type SheetFooterProps = React.ComponentProps<"div">;

const SheetFooter: FC<SheetFooterProps> = ({ className, ...props }) => {
  return (
    <div
      data-slot="sheet-footer"
      className={cn("mt-auto flex flex-col gap-2 p-4", className)}
      {...props}
    />
  );
};

type SheetTitleProps = React.ComponentProps<typeof SheetPrimitive.Title>;

const SheetTitle: FC<SheetTitleProps> = ({ className, ...props }) => {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn("text-base font-medium text-foreground", className)}
      {...props}
    />
  );
};

type SheetDescriptionProps = React.ComponentProps<typeof SheetPrimitive.Description>;

const SheetDescription: FC<SheetDescriptionProps> = ({ className, ...props }) => {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
};

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};
