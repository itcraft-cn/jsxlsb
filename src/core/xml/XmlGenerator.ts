export class XmlGenerator {
  static generateAppXml(sheetCount: number, sheetNames?: string[]): string {
    let xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
    xml += '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">\n';
    xml += `<Application>Microsoft Excel</Application>\n`;
    xml += `<SheetCount>${sheetCount}</SheetCount>\n`;

    if (sheetNames && sheetNames.length > 0) {
      xml += '<TitlesOfParts>\n';
      xml += '<vt:vector size="' + sheetCount + '" baseType="lpstr" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">\n';
      for (const name of sheetNames) {
        xml += `<vt:lpstr>${this.escapeXml(name)}</vt:lpstr>\n`;
      }
      xml += '</vt:vector>\n';
      xml += '</TitlesOfParts>\n';
    }

    xml += '</Properties>';
    return xml;
  }

  static generateCoreXml(): string {
    const now = new Date().toISOString();
    let xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
    xml += '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">\n';
    xml += `<dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created>\n`;
    xml += `<dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified>\n`;
    xml += '</cp:coreProperties>';
    return xml;
  }

  static generateThemeXml(): string {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Office Theme">
<a:themeElements>
<a:clrScheme name="Office">
<a:dk1><a:sysClr val="windowText" lastClr="000000"/></a:dk1>
<a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1>
<a:dk2><a:srgbClr val="1F497D"/></a:dk2>
<a:lt2><a:srgbClr val="EEECE1"/></a:lt2>
<a:accent1><a:srgbClr val="4F81BD"/></a:accent1>
<a:accent2><a:srgbClr val="C0504D"/></a:accent2>
<a:accent3><a:srgbClr val="9BBB59"/></a:accent3>
<a:accent4><a:srgbClr val="8064A2"/></a:accent4>
<a:accent5><a:srgbClr val="4BACC6"/></a:accent5>
<a:accent6><a:srgbClr val="F79646"/></a:accent6>
<a:hlink><a:srgbClr val="0000FF"/></a:hlink>
<a:folHlink><a:srgbClr val="800080"/></a:folHlink>
</a:clrScheme>
<a:fontScheme name="Office">
<a:majorFont>
<a:latin typeface="Cambria"/>
<a:ea typeface=""/>
<a:cs typeface=""/>
</a:majorFont>
<a:minorFont>
<a:latin typeface="Calibri"/>
<a:ea typeface=""/>
<a:cs typeface=""/>
</a:minorFont>
</a:fontScheme>
<a:fmtScheme name="Office">
<a:fillStyleLst>
<a:noFill/>
<a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill>
</a:fillStyleLst>
<a:lnStyleLst>
<a:noLn/>
</a:lnStyleLst>
<a:effectStyleLst>
<a:noEffect/>
</a:effectStyleLst>
</a:fmtScheme>
</a:themeElements>
</a:theme>`;
  }

  static toUint8Array(xml: string): Uint8Array {
    return new TextEncoder().encode(xml);
  }

  private static escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}