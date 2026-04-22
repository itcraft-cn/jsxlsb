export interface HtmlConfig {
    maxRows: number;
    maxColumns: number;
    showHeader: boolean;
    stickyHeader: boolean;
    cellWidth: number;
    theme: 'light' | 'dark';
    customStyles: Record<string, string>;
}
export declare const defaultHtmlConfig: HtmlConfig;
