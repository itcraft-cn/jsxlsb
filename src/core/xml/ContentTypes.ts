export class ContentTypes {
  private overrides: { partName: string; contentType: string }[] = [];

  addOverride(partName: string, contentType: string): void {
    this.overrides.push({ partName, contentType });
  }

  toXml(): string {
    let xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
    xml += '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">';
    xml += '<Default Extension="bin" ContentType="application/vnd.ms-excel.sheet.binary.macroEnabled.main"/>';
    xml += '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>';
    xml += '<Default Extension="xml" ContentType="application/xml"/>';

    for (const o of this.overrides) {
      xml += `<Override PartName="${o.partName}" ContentType="${o.contentType}"/>`;
    }

    xml += '</Types>';
    return xml;
  }

  toUint8Array(): Uint8Array {
    return new TextEncoder().encode(this.toXml());
  }
}