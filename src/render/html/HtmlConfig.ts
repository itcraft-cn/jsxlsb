export interface HtmlConfig {
  maxRows: number;
  maxColumns: number;
  showHeader: boolean;
  stickyHeader: boolean;
  cellWidth: number;
  theme: 'light' | 'dark';
  customStyles: Record<string, string>;
}

export const defaultHtmlConfig: HtmlConfig = {
  maxRows: 1000,
  maxColumns: 50,
  showHeader: true,
  stickyHeader: true,
  cellWidth: 100,
  theme: 'light',
  customStyles: {}
};