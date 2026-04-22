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

export const defaultCanvasConfig: CanvasConfig = {
  cellWidth: 80,
  cellHeight: 24,
  headerWidth: 40,
  headerHeight: 24,
  fontFamily: 'Arial',
  fontSize: 12,
  borderColor: '#d0d0d0',
  backgroundColor: '#ffffff',
  headerBackgroundColor: '#f0f0f0',
  textColor: '#333333',
  maxRenderRows: 10000,
  maxRenderColumns: 100
};