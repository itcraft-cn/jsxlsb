import { XlsbReader } from '../../api/XlsbReader';
import { HtmlConfig } from './HtmlConfig';
export declare class HtmlRenderer {
    private config;
    private customStyles;
    constructor(config?: Partial<HtmlConfig>);
    render(reader: XlsbReader, sheetIndex: number, config?: Partial<HtmlConfig>): HTMLTableElement;
    renderTo(container: HTMLElement, reader: XlsbReader, sheetIndex: number, config?: Partial<HtmlConfig>): void;
    setStyles(styles: Record<string, string>): void;
    private columnToLetter;
}
