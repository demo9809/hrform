import { useEffect } from 'react';

export const useEnterNavigation = (containerRef: React.RefObject<HTMLElement | null>) => {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key !== 'Enter') return;

            // Allow default behavior for buttons, textareas (for new lines), and links
            const target = e.target as HTMLElement;
            if (
                target.tagName === 'BUTTON' ||
                target.tagName === 'A' ||
                (target.tagName === 'TEXTAREA' && !e.shiftKey) // Shift+Enter usually new line, plain Enter might be submit or next. Let's assume Enter on textarea is new line for now unless we want to override.
                // Actually, standard behavior for Enter in textarea is new line. We should skip navigation.
            ) {
                return;
            }

            e.preventDefault();

            const container = containerRef.current;
            if (!container) return;

            const focusableElements = Array.from(
                container.querySelectorAll(
                    'input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])'
                )
            ) as HTMLElement[];

            const currentIndex = focusableElements.indexOf(target);
            if (currentIndex !== -1 && currentIndex < focusableElements.length - 1) {
                focusableElements[currentIndex + 1].focus();
            }
        };

        const container = containerRef.current;
        if (container) {
            container.addEventListener('keydown', handleKeyDown);
        }

        return () => {
            if (container) {
                container.removeEventListener('keydown', handleKeyDown);
            }
        };
    }, [containerRef]);
};
