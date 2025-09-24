import React from "react";

export function useLocalStorage<T>(key: string, initialValue: T) {
    const [value, setValue] = React.useState<T>(() => {
        const storedValue = localStorage.getItem(key);
        return storedValue ? JSON.parse(storedValue) : initialValue;
    });

    React.useEffect(() => {
        localStorage.setItem(key, JSON.stringify(value));
    }, [value, key]);

    return [value, setValue] as const;
}