export declare const defaultStyles: {
    table: {
        'border-collapse': string;
        width: string;
        'font-family': string;
        'font-size': string;
    };
    header: {
        'background-color': string;
        'font-weight': string;
        border: string;
        padding: string;
        'text-align': string;
    };
    cell: {
        border: string;
        padding: string;
        'text-align': string;
    };
    numberCell: {
        'text-align': string;
    };
    darkTheme: {
        table: {
            'background-color': string;
            color: string;
        };
        header: {
            'background-color': string;
            border: string;
        };
        cell: {
            border: string;
        };
    };
};
export declare function applyStyles(element: HTMLElement, styles: Record<string, string>): void;
