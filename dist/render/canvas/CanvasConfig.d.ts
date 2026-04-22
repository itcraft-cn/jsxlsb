export interface CanvasConfig {
    cellWidth: number;
    cellHeight: number;
    headerWidth: number;
    headerHeight: number;
    fontFamily: string;
    fontSize: number;
    borderColor: string;
    backgroundColor: string;
    headerBackgroundColor: string;
    textColor: string;
    maxRenderRows: number;
    maxRenderColumns: number;
}
export declare const defaultCanvasConfig: CanvasConfig;
