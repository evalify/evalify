"use client";

import * as CollapsiblePrimitive from "@radix-ui/react-collapsible";

/**
 * Wraps the Radix Collapsible root and attaches a `data-slot="collapsible"` attribute.
 *
 * @param props - Props forwarded to the underlying CollapsiblePrimitive.Root component
 * @returns A CollapsiblePrimitive.Root element with `data-slot="collapsible"` and the provided props
 */
function Collapsible({ ...props }: React.ComponentProps<typeof CollapsiblePrimitive.Root>) {
    return <CollapsiblePrimitive.Root data-slot="collapsible" {...props} />;
}

/**
 * Wraps Radix UI's CollapsibleTrigger, forwards all props and sets `data-slot="collapsible-trigger"`.
 *
 * @param props - Props forwarded to the underlying Radix `CollapsibleTrigger`.
 * @returns The underlying `CollapsibleTrigger` element with `data-slot="collapsible-trigger"` and forwarded props.
 */
function CollapsibleTrigger({
    ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleTrigger>) {
    return <CollapsiblePrimitive.CollapsibleTrigger data-slot="collapsible-trigger" {...props} />;
}

/**
 * Renders the collapsible content panel.
 *
 * @param props - Props forwarded to the underlying collapsible content element.
 * @returns A React element representing the collapsible content panel with `data-slot="collapsible-content"`.
 */
function CollapsibleContent({
    ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleContent>) {
    return <CollapsiblePrimitive.CollapsibleContent data-slot="collapsible-content" {...props} />;
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent };
