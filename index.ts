import { FileSpanExporter } from "./FileSpanExporter.js";
import { SpanKind, SpanStatusCode } from "@opentelemetry/api";
import {
  BasicTracerProvider,
  SimpleSpanProcessor,
} from "@opentelemetry/sdk-trace-base";
import { Resource } from "@opentelemetry/resources";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";
import * as path from "path";

// Configure the tracer
const provider = new BasicTracerProvider({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: "busy-agent",
    [SemanticResourceAttributes.SERVICE_VERSION]: "1.0.0",
  }),
});

// Set up the file exporter
const fileExporter = new FileSpanExporter(
  path.join(process.cwd(), "spans.json")
);
provider.addSpanProcessor(new SimpleSpanProcessor(fileExporter));
provider.register();

const tracer = provider.getTracer("load-generator");

// Simulate different types of operations
const operations = [
  {
    name: "gen_ai.request",
    attributes: {
      "gen_ai.system": "openai",
      "gen_ai.request.model": "gpt-4",
      "gen_ai.request.temperature": 0.7,
      "gen_ai.request.max_tokens": 1000,
    },
    minDuration: 50,
    maxDuration: 200,
  },
  {
    name: "gen_ai.system.message",
    attributes: {
      "gen_ai.message.role": "system",
      "gen_ai.message.content":
        "You are a helpful assistant that can use tools to answer questions.",
      "gen_ai.message.index": 0,
    },
    minDuration: 20,
    maxDuration: 50,
  },
  {
    name: "gen_ai.user.message",
    attributes: {
      "gen_ai.message.role": "user",
      "gen_ai.message.content": "What's the weather in San Francisco today?",
      "gen_ai.message.index": 1,
    },
    minDuration: 10,
    maxDuration: 30,
  },
  {
    name: "gen_ai.tool_call",
    attributes: {
      "gen_ai.tool.name": "get_weather",
      "gen_ai.tool.parameters": JSON.stringify({
        location: "San Francisco",
        unit: "celsius",
      }),
      "gen_ai.tool.call_id": "call_123456",
    },
    minDuration: 100,
    maxDuration: 300,
  },
  {
    name: "gen_ai.tool_result",
    attributes: {
      "gen_ai.tool.name": "get_weather",
      "gen_ai.tool.call_id": "call_123456",
      "gen_ai.tool.result": JSON.stringify({
        temperature: 18,
        condition: "Sunny",
        humidity: 65,
      }),
    },
    minDuration: 5,
    maxDuration: 20,
  },
  {
    name: "gen_ai.assistant.message",
    attributes: {
      "gen_ai.message.role": "assistant",
      "gen_ai.message.content":
        "The weather in San Francisco today is sunny with a temperature of 18°C and humidity of 65%.",
      "gen_ai.message.index": 2,
      "gen_ai.usage.prompt_tokens": 120,
      "gen_ai.usage.completion_tokens": 25,
      "gen_ai.usage.total_tokens": 145,
    },
    minDuration: 200,
    maxDuration: 500,
  },
];

// Helper function to generate random duration
function getRandomDuration(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

// Helper function to simulate occasional errors
function shouldSimulateError(): boolean {
  return Math.random() < 0.05; // 5% error rate
}

// Generate spans
async function generateSpan() {
  const operation = operations[Math.floor(Math.random() * operations.length)];
  const span = tracer.startSpan(operation.name, {
    kind: SpanKind.INTERNAL,
  });

  // Create a copy of attributes to modify
  const attributes = { ...operation.attributes };

  // Randomize attributes based on operation type
  if (operation.name === "gen_ai.user.message") {
    const userPrompts = [
      "What's the weather in San Francisco today?",
      "Tell me about the history of quantum computing",
      "How do I make chocolate chip cookies?",
      "What are the best hiking trails near Seattle?",
      "Can you explain how blockchain works?",
      "What's the current exchange rate between USD and EUR?",
    ];
    attributes["gen_ai.message.content"] =
      userPrompts[Math.floor(Math.random() * userPrompts.length)];
  } else if (operation.name === "gen_ai.tool_call") {
    const tools = [
      {
        name: "get_weather",
        params: { location: "San Francisco", unit: "celsius" },
      },
      { name: "search_web", params: { query: "quantum computing history" } },
      { name: "get_recipe", params: { dish: "chocolate chip cookies" } },
      {
        name: "find_trails",
        params: { location: "Seattle", difficulty: "moderate" },
      },
      { name: "explain_concept", params: { topic: "blockchain" } },
      { name: "get_exchange_rate", params: { from: "USD", to: "EUR" } },
    ];
    const selectedTool = tools[Math.floor(Math.random() * tools.length)];
    attributes["gen_ai.tool.name"] = selectedTool.name;
    attributes["gen_ai.tool.parameters"] = JSON.stringify(selectedTool.params);
    attributes["gen_ai.tool.call_id"] = `call_${Math.floor(
      Math.random() * 1000000
    )}`;
  } else if (operation.name === "gen_ai.tool_result") {
    // Match tool result to a possible tool call
    const toolResults = {
      get_weather: {
        temperature: Math.floor(Math.random() * 35),
        condition: ["Sunny", "Cloudy", "Rainy", "Snowy"][
          Math.floor(Math.random() * 4)
        ],
        humidity: Math.floor(Math.random() * 100),
      },
      search_web: {
        results: ["Article 1", "Article 2", "Article 3"],
        source: "Wikipedia",
      },
      get_recipe: {
        ingredients: ["flour", "sugar", "chocolate chips"],
        steps: 5,
      },
      find_trails: {
        trails: ["Trail 1", "Trail 2"],
        distance: Math.floor(Math.random() * 10) + "km",
      },
      explain_concept: {
        summary: "A complex technology with many applications",
      },
      get_exchange_rate: { rate: (0.8 + Math.random() * 0.2).toFixed(4) },
    };

    const toolName = attributes["gen_ai.tool.name"] || "get_weather";
    const result = toolResults[toolName] || toolResults["get_weather"];
    attributes["gen_ai.tool.result"] = JSON.stringify(result);
  } else if (operation.name === "gen_ai.assistant.message") {
    const responses = [
      "Based on the weather data, it's currently sunny with a temperature of 22°C and humidity of 65%.",
      "Quantum computing began in the early 1980s when physicists first proposed using quantum mechanics to solve computational problems.",
      "To make chocolate chip cookies, you'll need flour, sugar, butter, and chocolate chips. First, preheat your oven to 375°F...",
      "The most popular hiking trails near Seattle include Discovery Park Loop Trail and Mount Si Trail.",
      "Blockchain is a distributed ledger technology that maintains a continuously growing list of records called blocks.",
      "The current exchange rate is 1 USD to 0.92 EUR.",
    ];
    attributes["gen_ai.message.content"] =
      responses[Math.floor(Math.random() * responses.length)];
    attributes["gen_ai.usage.prompt_tokens"] =
      Math.floor(Math.random() * 200) + 50;
    attributes["gen_ai.usage.completion_tokens"] =
      Math.floor(Math.random() * 100) + 10;
    attributes["gen_ai.usage.total_tokens"] =
      attributes["gen_ai.usage.prompt_tokens"] +
      attributes["gen_ai.usage.completion_tokens"];
  }

  // Add attributes
  Object.entries(operation.attributes).forEach(([key, value]) => {
    span.setAttribute(key, value);
  });

  // Simulate work
  const duration = getRandomDuration(
    operation.minDuration,
    operation.maxDuration
  );
  await new Promise((resolve) => setTimeout(resolve, duration));

  // Simulate occasional errors
  if (shouldSimulateError()) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: `Simulated error in ${operation.name}`,
    });
    span.recordException(new Error(`Simulated error in ${operation.name}`));
  } else {
    span.setStatus({ code: SpanStatusCode.OK });
  }

  span.end();
}

// Main generation loop
async function startGeneration() {
  console.log("Starting span generation...");

  // Generate spans continuously
  while (true) {
    await generateSpan();
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Generate one span per second
  }
}

// Handle shutdown
process.on("SIGINT", async () => {
  console.log("\nShutting down...");
  await provider.shutdown();
  process.exit(0);
});

// Start generation
startGeneration().catch((error) => {
  console.error("Error in span generation:", error);
  process.exit(1);
});
