import { ReadableSpan } from "@opentelemetry/sdk-trace-base";
import * as fs from "fs";
import * as path from "path";
import { SpanExporter } from '@opentelemetry/sdk-trace-base';

// Custom file exporter for OpenTelemetry spans
export class FileSpanExporter implements SpanExporter {
  private readonly filePath: string;
  
  constructor(filePath: string) {
    this.filePath = filePath;
    // Ensure directory exists
    this.ensureDirectoryExists(path.dirname(filePath));
    // Create or clear the file
    fs.writeFileSync(this.filePath, "");
    console.log(`Telemetry will be written to: ${this.filePath}`);
  }

  // Helper method to ensure directory exists (replacement for fs-extra's ensureDirSync)
  private ensureDirectoryExists(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      this.ensureDirectoryExists(path.dirname(dirPath));
      fs.mkdirSync(dirPath);
    }
  }

  export(spans: ReadableSpan[]) {
    try {
      const serializedSpans = spans.map(span => ({
        traceId: span.spanContext().traceId,
        spanId: span.spanContext().spanId,
        name: span.name,
        kind: span.kind,
        startTime: span.startTime,
        endTime: span.endTime,
        attributes: span.attributes,
        events: span.events,
        status: span.status,
        links: span.links,
        resource: span.resource.attributes,
      }));

      // Append to file
      fs.appendFileSync(
        this.filePath, 
        serializedSpans.map(span => JSON.stringify(span)).join('\n') + '\n'
      );
      
      return Promise.resolve();
    } catch (error) {
      console.error('FileSpanExporter error', error);
      return Promise.resolve();
    }
  }

  shutdown() {
    console.log("FileSpanExporter shutting down");
    return Promise.resolve();
  }
}